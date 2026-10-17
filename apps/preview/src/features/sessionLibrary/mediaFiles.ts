import { Directory, File, Paths } from "expo-file-system";
import type { IMediaFiles } from "./mediaModel";
import { isMediaClipPath, mediaConnectionPath } from "./mediaPaths";

export function createMediaFiles(): IMediaFiles {
  const root = new Directory(Paths.document, "pulsar-media");
  const fileAt = (clipPath: string) => {
    if (!isMediaClipPath(clipPath)) throw new Error("A Studio media path is invalid");
    return new File(root, clipPath);
  };
  return {
    uri: (clipPath) => fileAt(clipPath).uri,
    exists: async (clipPath) => fileAt(clipPath).exists,
    download: async (url, clipPath, onProgress, signal) => {
      const target = fileAt(clipPath);
      target.parentDirectory.create({ intermediates: true, idempotent: true });
      const partial = new File(`${target.uri}.download`);
      try {
        const file = await File.downloadFileAsync(url, partial, {
          idempotent: true,
          signal,
          onProgress: ({ bytesWritten, totalBytes }) => {
            if (totalBytes > 0) onProgress?.(bytesWritten / totalBytes);
          },
        });
        await file.move(target);
      } finally {
        if (partial.exists) partial.delete();
      }
    },
    remove: async (clipPath) => {
      const file = fileAt(clipPath);
      if (file.exists) file.delete();
    },
    purge: async (connectionId) => {
      const directory = new Directory(root, mediaConnectionPath(connectionId));
      if (directory.exists) directory.delete();
    },
  };
}
