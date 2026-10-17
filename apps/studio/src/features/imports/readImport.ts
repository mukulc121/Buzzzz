import { isProject, isRecord } from "@buzzzz/core";
import { MAX_ARCHIVE_BYTES, MAX_MEMBER_BYTES, readJson, unpackArchive } from "./archive";
import { readAhap } from "./ahap";
import { readPulsarBundle } from "./bundle";
import { readLofelt } from "./lofelt";
import { validateMediaFile } from "./media";
import type { Imported } from "./model";
import { numberIn, readPulsarPattern } from "./pattern";
import { readRiveAttachment, validateRive } from "./rive";
import { audioSignature, isRive, isZip } from "./signatures";

function readProjectJson(value: unknown): Extract<Imported, { kind: "project" }> | null {
  if (isProject(value))
    return {
      kind: "project",
      project: {
        presets: value.presets,
        map: value.map,
        riveStateMachine: value.riveStateMachine,
        ...(value.riveConfig ? { riveConfig: value.riveConfig } : {}),
        ...(value.rivePresetId !== undefined ? { rivePresetId: value.rivePresetId } : {}),
      },
      durations: Object.fromEntries(
        value.presets.flatMap((preset): [string, number][] =>
          "duration" in preset
            ? [[preset.id, numberIn(preset.duration, 60000, "Preset duration")]]
            : [],
        ),
      ),
      ...readRiveAttachment("riv" in value ? value.riv : null),
    };
  if (
    !isRecord(value) ||
    !Array.isArray(value.presets) ||
    !value.presets.length ||
    value.presets.length > 1000
  )
    return null;
  const rawPresets: unknown[] = value.presets;
  const presets = rawPresets.map((preset) => {
    if (!isRecord(preset)) throw new Error("Invalid project preset");
    const pattern = readPulsarPattern(preset.pattern ?? preset);
    if (!pattern) throw new Error("Invalid project haptic data");
    return { id: preset.id, name: preset.name, pattern };
  });
  const project = {
    presets,
    map: value.map ?? {},
    ...(value.riveConfig !== undefined ? { riveConfig: value.riveConfig } : {}),
    ...(value.rivePresetId !== undefined ? { rivePresetId: value.rivePresetId } : {}),
  };
  if (!isProject(project)) throw new Error("Invalid project presets or mappings");
  const durations = rawPresets.flatMap((preset): [string, number][] =>
    isRecord(preset) && typeof preset.id === "string" && preset.duration !== undefined
      ? [[preset.id, numberIn(preset.duration, 60000, "Preset duration")]]
      : [],
  );
  return {
    kind: "project",
    project,
    durations: Object.fromEntries(durations),
    ...readRiveAttachment(value.riv),
  };
}

export async function readImport(file: File): Promise<Imported> {
  if (file.size > MAX_ARCHIVE_BYTES) throw new Error("Project files must be 32 MB or smaller");
  const head = new Uint8Array(await file.slice(0, 64).arrayBuffer());
  if (isRive(head)) {
    if (file.size > MAX_MEMBER_BYTES) throw new Error("Rive files must be 20 MB or smaller");
    const riv = { name: file.name, buffer: await file.arrayBuffer() };
    validateRive(riv);
    return { kind: "rive", riv };
  }
  const audio = audioSignature(head);
  if (audio) {
    const normalized = new File([file], file.name, {
      type: audio.type,
      lastModified: file.lastModified,
    });
    await validateMediaFile(normalized, "audio");
    return {
      kind: "audio",
      file: normalized,
    };
  }
  if (isZip(head)) {
    const files = unpackArchive(new Uint8Array(await file.arrayBuffer()));
    if (!files["manifest.json"]) throw new Error("The archive has no manifest.json");
    const manifest = readJson(files["manifest.json"]);
    if (isRecord(manifest) && Array.isArray(manifest.presets))
      return readPulsarBundle(files, manifest, file.name.replace(/\.[^.]+$/, ""));
    if (isRecord(manifest) && Array.isArray(manifest.animations)) {
      await validateMediaFile(file, "animation");
      return {
        kind: "animation",
        file: new File([file], file.name, {
          type: "application/zip+dotlottie",
          lastModified: file.lastModified,
        }),
      };
    }
    throw new Error("Choose a Pulsar project bundle or dotLottie animation");
  }
  const beginning = new TextDecoder()
    .decode(head)
    .replace(/^\uFEFF/, "")
    .trimStart();
  if (beginning && !beginning.startsWith("{")) {
    if (file.size > MAX_MEMBER_BYTES && file.name.toLowerCase().endsWith(".riv"))
      throw new Error("Rive files must be 20 MB or smaller");
    throw new Error("Choose a supported haptic, project, audio, Rive or Lottie file");
  }
  let data: unknown;
  try {
    data = JSON.parse(await file.text());
  } catch {
    throw new Error("The selected file does not contain valid JSON");
  }
  const name = file.name.replace(/\.[^.]+$/, "");
  const project = readProjectJson(data);
  if (project) return project;
  const pattern = readPulsarPattern(data);
  if (pattern) return { kind: "pattern", pattern, name };
  const ahap = readAhap(data);
  if (ahap) return { kind: "pattern", name, ...ahap };
  const lofelt = readLofelt(data);
  if (lofelt) return { kind: "pattern", pattern: lofelt, name };
  if (isRecord(data) && Array.isArray(data.layers)) {
    await validateMediaFile(file, "animation");
    return {
      kind: "animation",
      file: new File([file], file.name, {
        type: "application/json",
        lastModified: file.lastModified,
      }),
    };
  }
  throw new Error("Choose a valid Pulsar pattern, AHAP, Lofelt, Lottie or Buzzzz project file");
}
