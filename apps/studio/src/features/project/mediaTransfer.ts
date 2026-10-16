import type { Project } from "@buzzzz/core";
import type { IImportedMedia } from "../imports/model";
import {
  addMedia,
  attachMedia,
  deleteMedia,
  listAttachments,
  listMedia,
  readMediaFile,
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
): Promise<IImportedMedia[]> {
  const media: IImportedMedia[] = [];
  for (const preset of project.presets) {
    for (const attachment of await listAttachments(projectId, preset.id)) {
      if (attachment.kind === "rive") continue;
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
