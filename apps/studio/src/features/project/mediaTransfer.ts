import { resolveRivePresetId, type Project } from "@buzzzz/core";
import type { IImportedMedia } from "../imports/model";
import type { IExportFiles } from "../export/model";
import {
  addMedia,
  addMediaCopy,
  attachMedia,
  deleteMedia,
  listAttachments,
  listMedia,
  readMediaFile,
  rollbackMediaCopy,
  setMediaTrim,
} from "../media/repository";

export async function removeProjectMedia(projectId: string) {
  for (const item of await listMedia(projectId)) await deleteMedia(item.id);
}

export async function importProjectMedia(
  projectId: string,
  media: readonly IImportedMedia[],
  riv: { name: string; buffer: ArrayBuffer } | null,
) {
  for (const entry of media) {
    const item = await addMedia({ projectId, file: entry.file, kind: entry.kind });
    await attachMedia({ projectId, presetId: entry.presetId, assetId: item.id });
    if (entry.window)
      await setMediaTrim({
        projectId,
        presetId: entry.presetId,
        kind: entry.kind,
        trim: {
          startMs: entry.window.startMs,
          endMs: entry.window.startMs + entry.window.durationMs,
        },
      });
  }
  if (riv) {
    const item = await addMedia({
      projectId,
      kind: "rive",
      file: new File([riv.buffer], riv.name, { type: "application/octet-stream" }),
    });
    await attachMedia({ projectId, presetId: "", assetId: item.id });
  }
}

export async function exportProjectMedia(
  projectId: string,
  project: Project,
  files?: IExportFiles,
): Promise<IImportedMedia[]> {
  const media: IImportedMedia[] = [];
  for (const preset of project.presets) {
    for (const attachment of await listAttachments(projectId, preset.id)) {
      if (attachment.kind === "rive") continue;
      if (
        files &&
        ((attachment.kind === "audio" && !files.includeAudio) ||
          (attachment.kind === "animation" && !files.includeAnimation))
      )
        continue;
      media.push({
        presetId: preset.id,
        kind: attachment.kind,
        file: await readMediaFile(attachment.assetId),
        ...(attachment.trim
          ? {
              window: {
                startMs: attachment.trim.startMs,
                durationMs: attachment.trim.endMs - attachment.trim.startMs,
              },
            }
          : {}),
      });
    }
  }
  return media;
}

export async function exportProjectRive(projectId: string, project: Project) {
  const owner = resolveRivePresetId(project);
  if (!owner) return null;
  const attachment = (await listAttachments(projectId, owner)).find((item) => item.kind === "rive");
  if (!attachment) return null;
  const file = await readMediaFile(attachment.assetId);
  return { name: file.name, buffer: await file.arrayBuffer() };
}

// Copies a pattern's audio/animation into another project; returns an undo for failed copies.
export async function copyPresetMedia(
  source: { projectId: string; presetId: string },
  target: { projectId: string; presetId: string },
): Promise<() => Promise<void>> {
  const files: Parameters<typeof rollbackMediaCopy>[1] = [];
  const undo = () => rollbackMediaCopy(target, files);
  try {
    for (const attachment of await listAttachments(source.projectId, source.presetId)) {
      if (attachment.kind === "rive") continue;
      const file = await readMediaFile(attachment.assetId);
      const { item, created } = await addMediaCopy({
        projectId: target.projectId,
        file,
        kind: attachment.kind,
      });
      const owned = { id: item.id, kind: attachment.kind, created, attached: false };
      files.push(owned);
      await attachMedia({ ...target, assetId: item.id, replace: false });
      owned.attached = true;
      if (attachment.trim)
        await setMediaTrim({ ...target, kind: attachment.kind, trim: attachment.trim });
    }
  } catch (error) {
    await undo();
    throw error;
  }
  return undo;
}
