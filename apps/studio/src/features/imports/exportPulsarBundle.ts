import { isProject, patternEnd, resolveRivePresetId, type Preset } from "@buzzzz/core";
import { strToU8, zipSync } from "fflate";
import { MAX_ARCHIVE_BYTES, MAX_MEMBER_BYTES, pulsarContentHash } from "./archive";
import { readMediaWindow } from "./bundle";
import { validateMediaFile } from "./media";
import type { IPulsarExport } from "./model";
import { numberIn } from "./pattern";
import { validateRive } from "./rive";
import { normalizeDexConfig } from "../project/starter/rive/normalizeDexConfig";

interface IBundlePreset {
  id: string;
  name: string;
  duration: number;
  haptics: string;
  audio?: { src: string; volume: number; offset: number };
  animation?: { src: string; frameRate?: number; totalFrames?: number };
}
function portableId(name: string, used: Set<string>) {
  const words = name.match(/[A-Za-z0-9]+/g) ?? ["preset"];
  const first = words[0].toLowerCase();
  const base = `${/^[A-Za-z]/.test(first) ? "" : "p"}${first}${words
    .slice(1)
    .map((word) => word[0].toUpperCase() + word.slice(1).toLowerCase())
    .join("")}`.slice(0, 120);
  let id = base;
  let suffix = 2;
  while (used.has(id)) id = `${base}${suffix++}`;
  used.add(id);
  return id;
}

export async function exportPulsarBundle(options: IPulsarExport): Promise<Blob> {
  const { project, riv, stateMachine, media = [], durations = {} } = options;
  const rivePresetId = resolveRivePresetId(project);
  const riveConfig = normalizeDexConfig(project.riveConfig, rivePresetId);
  if (!isProject(project)) throw new Error("Choose a valid Buzzzz project to export");
  const name = options.name?.trim() || "Buzzzz project";
  const id =
    options.id?.trim() ||
    `com.buzzzz.${
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "project"
    }`;
  if (
    name.length > 512 ||
    id.length > 512 ||
    (stateMachine !== undefined && stateMachine.length > 512)
  )
    throw new Error("Bundle names, IDs and state machines must be 512 characters or shorter");
  const files: Record<string, Uint8Array> = {};
  const originalIds: Record<string, string> = {};
  const editors: Record<string, NonNullable<Preset["editor"]>> = {};
  const windows = new Map<string, Record<string, { startMs: number; durationMs: number }>>();
  const presets: IBundlePreset[] = [];
  const byId = new Map<string, IBundlePreset>();
  const used = new Set<string>();
  for (const preset of project.presets) {
    const key = portableId(preset.name, used);
    const path = `haptics/${key}.json`;
    files[path] = strToU8(JSON.stringify(preset.pattern));
    if (files[path].length > MAX_MEMBER_BYTES)
      throw new Error("An exported pattern exceeds the 20 MB member limit");
    const duration =
      durations[preset.id] === undefined
        ? (preset.editor?.durationMs ?? patternEnd(preset.pattern))
        : numberIn(durations[preset.id], 60000, "Preset duration");
    const item: IBundlePreset = {
      id: key,
      name: preset.name,
      duration: Math.round(Math.max(duration, patternEnd(preset.pattern))),
      haptics: path,
    };
    presets.push(item);
    byId.set(preset.id, item);
    originalIds[key] = preset.id;
    if (preset.editor) editors[key] = preset.editor;
  }
  for (const attachment of media) {
    const preset = byId.get(attachment.presetId);
    if (!preset) throw new Error("A media attachment references a preset outside this project");
    if (attachment.kind !== "audio" && attachment.kind !== "animation")
      throw new Error("Invalid media attachment kind");
    if (preset[attachment.kind])
      throw new Error("A preset may have only one attachment of each media kind");
    const signature = await validateMediaFile(attachment.file, attachment.kind);
    const path = `${attachment.kind}/${preset.id}.${signature.extension}`;
    files[path] = new Uint8Array(await attachment.file.arrayBuffer());
    if (attachment.kind === "audio") preset.audio = { src: path, volume: 1, offset: 0 };
    else
      preset.animation = {
        src: path,
        frameRate: signature.frameRate,
        totalFrames: signature.totalFrames,
      };
    const window = readMediaWindow(attachment.window);
    if (
      window &&
      signature.durationMs !== undefined &&
      window.startMs + window.durationMs > signature.durationMs + 1
    )
      throw new Error("The media trim window extends beyond its source file");
    if (window) {
      const perPreset = windows.get(preset.id) ?? {};
      perPreset[attachment.kind] = window;
      windows.set(preset.id, perPreset);
      preset.duration = Math.round(Math.max(preset.duration, window.durationMs));
    } else if (signature.durationMs !== undefined)
      preset.duration = Math.round(
        Math.max(preset.duration, Math.min(60000, signature.durationMs)),
      );
  }
  let rive: { src: string; name: string; stateMachine?: string } | undefined;
  if (riv && rivePresetId) {
    validateRive(riv);
    const path = "rive/animation.riv";
    files[path] = new Uint8Array(riv.buffer);
    rive = { src: path, name: riv.name, ...(stateMachine ? { stateMachine } : {}) };
  }
  const manifest = {
    schema: "pulsar.bundle/1",
    generator: "buzzzz",
    id,
    name,
    presets,
    buzzzz: {
      version: 1,
      originalIds,
      map: project.map,
      ...(Object.keys(editors).length ? { editors } : {}),
      ...(windows.size ? { windows: Object.fromEntries(windows) } : {}),
      ...(rive ? { rive } : {}),
      ...(riv || project.riveConfig || project.rivePresetId !== undefined ? { rivePresetId } : {}),
      ...(rivePresetId && riveConfig ? { riveConfig } : {}),
    },
  };
  files["manifest.json"] = strToU8(JSON.stringify(manifest, null, 2));
  const initialSize = Object.values(files).reduce((size, bytes) => size + bytes.byteLength, 0);
  if (
    Object.keys(files).length > 1024 ||
    initialSize > 100 * 1024 * 1024 ||
    Object.values(files).some((bytes) => bytes.byteLength > MAX_MEMBER_BYTES)
  )
    throw new Error("The bundle exceeds its member, expanded size, or file count limits");
  const hash = await pulsarContentHash(files);
  files["manifest.json"] = strToU8(`${JSON.stringify({ ...manifest, hash }, null, 2)}\n`);
  const expanded = Object.values(files).reduce((size, bytes) => size + bytes.byteLength, 0);
  if (
    Object.keys(files).length > 1024 ||
    expanded > 100 * 1024 * 1024 ||
    files["manifest.json"].byteLength > MAX_MEMBER_BYTES
  )
    throw new Error("The bundle exceeds the 20 MB member, 100 MB expanded or 1,024 file limit");
  const archive = zipSync(files, { level: 6 });
  if (archive.byteLength > MAX_ARCHIVE_BYTES)
    throw new Error("The exported archive exceeds the 32 MB project limit");
  return new Blob([archive.slice()], { type: "application/zip" });
}
