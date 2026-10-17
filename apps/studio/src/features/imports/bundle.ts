import { isProject, isRecord, patternEnd, type Pattern } from "@buzzzz/core";
import { MAX_MEMBER_BYTES, pulsarContentHash, safeArchivePath } from "./archive";
import { validateMediaFile } from "./media";
import type { Imported, IImportedMedia, IRiveAsset } from "./model";
import { numberIn, readPulsarPattern } from "./pattern";
import { validateRive } from "./rive";
import { audioSignature, isZip } from "./signatures";

export function readMediaWindow(value: unknown): IImportedMedia["window"] {
  if (value === undefined || value === null) return undefined;
  if (!isRecord(value)) throw new Error("Invalid media trim window");
  const startMs = numberIn(value.startMs, Number.MAX_SAFE_INTEGER - 60000, "Media start");
  const durationMs = numberIn(value.durationMs, 60000, "Media duration");
  if (!durationMs) throw new Error("A media trim window must have positive duration");
  return { startMs, durationMs };
}
function member(files: Record<string, Uint8Array>, path: unknown) {
  if (typeof path !== "string" || !safeArchivePath(path) || !Object.hasOwn(files, path))
    throw new Error("The bundle references a missing or unsafe attachment");
  return files[path];
}
function text(value: unknown, fallback: string, allowEmpty = false) {
  if (value === undefined) return fallback;
  if (typeof value !== "string" || (!value && !allowEmpty) || value.length > 512)
    throw new Error("Bundle names and IDs must contain 1–512 characters");
  return value;
}

export async function readPulsarBundle(
  files: Record<string, Uint8Array>,
  manifest: unknown,
  fallbackName: string,
): Promise<Extract<Imported, { kind: "project" }>> {
  if (
    !isRecord(manifest) ||
    !Array.isArray(manifest.presets) ||
    !manifest.presets.length ||
    manifest.presets.length > 1000
  )
    throw new Error("A Pulsar bundle must list 1–1,000 presets");
  if (manifest.schema !== undefined && manifest.schema !== "pulsar.bundle/1")
    throw new Error("This Pulsar bundle schema is not supported");
  if (
    manifest.hash !== undefined &&
    (typeof manifest.hash !== "string" || manifest.hash !== (await pulsarContentHash(files)))
  )
    throw new Error("The Pulsar bundle content hash does not match its files");
  if (manifest.buzzzz !== undefined && !isRecord(manifest.buzzzz))
    throw new Error("Invalid Buzzzz bundle metadata");
  const extension = isRecord(manifest.buzzzz) ? manifest.buzzzz : {};
  if (
    (extension.originalIds !== undefined && !isRecord(extension.originalIds)) ||
    (extension.windows !== undefined && !isRecord(extension.windows)) ||
    (extension.editors !== undefined && !isRecord(extension.editors))
  )
    throw new Error("Invalid Buzzzz IDs, media windows, or editor metadata");
  const originals = isRecord(extension.originalIds) ? extension.originalIds : {};
  const windows = isRecord(extension.windows) ? extension.windows : {};
  const editors = isRecord(extension.editors) ? extension.editors : {};
  const ids = new Set<string>();
  const portableIds = new Set<string>();
  const patterns = new Map<string, Pattern>();
  let hapticBytes = 0;
  for (const entry of manifest.presets) {
    if (!isRecord(entry) || typeof entry.haptics !== "string")
      throw new Error("Invalid bundle preset");
    hapticBytes += member(files, entry.haptics).byteLength;
    if (hapticBytes > MAX_MEMBER_BYTES)
      throw new Error("The bundle's referenced haptics exceed the 20 MB logical project limit");
  }
  const presets = [];
  const media: IImportedMedia[] = [];
  const attachments = new Map<
    string,
    {
      kind: IImportedMedia["kind"];
      file: File;
      metadata: Awaited<ReturnType<typeof validateMediaFile>>;
    }
  >();
  const durationEntries: [string, number][] = [];
  for (const entry of manifest.presets) {
    if (!isRecord(entry)) throw new Error("Invalid bundle preset");
    const portableId = text(entry.id, "");
    const id = text(
      Object.hasOwn(originals, portableId) ? originals[portableId] : undefined,
      portableId,
    );
    if (!portableId || ids.has(id) || portableIds.has(portableId))
      throw new Error("Bundle preset IDs must be nonempty and unique");
    ids.add(id);
    portableIds.add(portableId);
    if (typeof entry.haptics !== "string") throw new Error("Invalid haptic attachment path");
    let pattern = patterns.get(entry.haptics);
    if (!pattern) {
      let value: unknown;
      try {
        value = JSON.parse(new TextDecoder().decode(member(files, entry.haptics)));
      } catch {
        throw new Error(`The haptic data for ${portableId} is not valid JSON`);
      }
      const parsed = readPulsarPattern(value);
      if (!parsed) throw new Error(`The haptic data for ${portableId} is invalid`);
      pattern = parsed;
      patterns.set(entry.haptics, pattern);
    }
    presets.push({
      id,
      name: text(entry.name, portableId, true),
      pattern,
      ...(Object.hasOwn(editors, portableId) ? { editor: editors[portableId] } : {}),
    });
    durationEntries.push([
      id,
      entry.duration === undefined
        ? patternEnd(pattern)
        : numberIn(entry.duration, 60000, "Preset duration"),
    ]);
    const perPresetWindows = isRecord(windows[portableId]) ? windows[portableId] : {};
    for (const kind of ["audio", "animation"] satisfies IImportedMedia["kind"][]) {
      const attachment = entry[kind];
      if (attachment === undefined || attachment === null) continue;
      if (!isRecord(attachment)) throw new Error(`Invalid ${kind} attachment metadata`);
      if (typeof attachment.src !== "string") throw new Error("Invalid media attachment path");
      let shared = attachments.get(attachment.src);
      if (shared && shared.kind !== kind)
        throw new Error("A media file cannot have conflicting kinds");
      if (!shared) {
        const data = member(files, attachment.src);
        const name = attachment.src.split("/").at(-1) ?? kind;
        const type =
          kind === "audio"
            ? audioSignature(data)?.type
            : isZip(data)
              ? "application/zip+dotlottie"
              : "application/json";
        const file = new File([data.slice()], name, { type });
        shared = { kind, file, metadata: await validateMediaFile(file, kind) };
        attachments.set(attachment.src, shared);
      }
      const { file, metadata } = shared;
      const window = readMediaWindow(perPresetWindows[kind] ?? attachment.window);
      if (
        window &&
        metadata.durationMs !== undefined &&
        window.startMs + window.durationMs > metadata.durationMs + 1
      )
        throw new Error("The media trim window extends beyond its source file");
      media.push({ presetId: id, kind, file, ...(window ? { window } : {}) });
    }
  }
  const map = extension.map ?? {};
  const project = {
    presets,
    map,
    ...(extension.riveConfig !== undefined ? { riveConfig: extension.riveConfig } : {}),
    ...(extension.rivePresetId !== undefined ? { rivePresetId: extension.rivePresetId } : {}),
  };
  if (!isProject(project)) throw new Error("The bundle contains invalid preset mappings");
  let riv: IRiveAsset | null = null;
  let stateMachine: string | undefined;
  if (extension.rive !== undefined) {
    if (!isRecord(extension.rive)) throw new Error("Invalid Rive bundle metadata");
    const data = member(files, extension.rive.src);
    riv = { name: text(extension.rive.name, "animation.riv"), buffer: data.slice().buffer };
    validateRive(riv);
    if (extension.rive.stateMachine !== undefined)
      stateMachine = text(extension.rive.stateMachine, "");
  }
  return {
    kind: "project",
    project,
    riv,
    ...(stateMachine ? { stateMachine } : {}),
    name: text(manifest.name, fallbackName),
    media,
    durations: Object.fromEntries(durationEntries),
  };
}
