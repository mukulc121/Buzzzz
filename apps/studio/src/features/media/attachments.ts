import { MediaStorageError, type IMediaItem, type IMediaTrim } from "./model";
import { checkMediaLimits } from "./rules";

const RIVE_MAGIC = [0x52, 0x49, 0x56, 0x45];

export async function readRiveFile(file: Blob): Promise<ArrayBuffer> {
  const blocked = checkMediaLimits(file.size, []);
  if (blocked) throw blocked;
  const buffer = await file.arrayBuffer();
  const head = new Uint8Array(buffer, 0, Math.min(4, buffer.byteLength));
  if (!RIVE_MAGIC.every((byte, index) => head[index] === byte))
    throw new MediaStorageError("invalid", "That isn't a Rive (.riv) file.");
  return buffer;
}

// The full default window is stored as null so hydration and fresh loads agree.
export function storedTrim(trim: IMediaTrim, durationMs: number): IMediaTrim | null {
  const startMs = Math.round(trim.startMs);
  const endMs = Math.max(startMs + 1, Math.round(trim.endMs));
  if (startMs === 0 && endMs === Math.round(Math.min(durationMs, 60_000))) return null;
  return { startMs, endMs };
}

export const sameTrim = (a: IMediaTrim | null, b: IMediaTrim | null) =>
  a === b || (a !== null && b !== null && a.startMs === b.startMs && a.endMs === b.endMs);

export const mediaUsage = (items: readonly Pick<IMediaItem, "size">[]) => ({
  files: items.length,
  bytes: items.reduce((total, item) => total + item.size, 0),
});
