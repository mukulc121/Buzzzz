import {
  MEDIA_LIMITS,
  MediaStorageError,
  type IMediaAttachment,
  type IMediaItem,
  type IMediaTrim,
  type MediaKind,
} from "./model";

const KINDS: readonly MediaKind[] = ["audio", "animation", "rive"];
const PROJECT_SCOPE = "*project";
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;
const isKind = (value: unknown): value is MediaKind => KINDS.some((kind) => kind === value);
const formatMiB = (bytes: number) => `${Math.round(bytes / 1024 / 1024)} MiB`;

// Rive files back the whole project; audio and animation belong to one pattern.
export const scopeFor = (kind: MediaKind, presetId: string) =>
  kind === "rive" ? PROJECT_SCOPE : presetId;

export function checkMediaLimits(size: number, existing: readonly Pick<IMediaItem, "size">[]) {
  if (size <= 0) return new MediaStorageError("invalid", "That file is empty.");
  if (size > MEDIA_LIMITS.fileBytes)
    return new MediaStorageError(
      "limit",
      `Files must be under ${formatMiB(MEDIA_LIMITS.fileBytes)}.`,
    );
  if (existing.length >= MEDIA_LIMITS.projectFiles)
    return new MediaStorageError(
      "limit",
      `A project holds at most ${MEDIA_LIMITS.projectFiles} media files. Delete one first.`,
    );
  const used = existing.reduce((total, item) => total + item.size, 0);
  if (used + size > MEDIA_LIMITS.projectBytes)
    return new MediaStorageError(
      "limit",
      `Project media is capped at ${formatMiB(MEDIA_LIMITS.projectBytes)}. Delete something first.`,
    );
  return null;
}

export function normalizeTrim(trim: IMediaTrim): IMediaTrim {
  const { startMs, endMs } = trim;
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || startMs < 0 || endMs <= startMs)
    throw new MediaStorageError("invalid", "Trim must start before it ends.");
  if (endMs - startMs > MEDIA_LIMITS.trimMs)
    throw new MediaStorageError("invalid", "Trim can be at most 60 seconds long.");
  return { startMs: Math.round(startMs), endMs: Math.round(endMs) };
}

export function normalizeName(name: string) {
  const value = name.trim().slice(0, MEDIA_LIMITS.nameLength);
  if (!value) throw new MediaStorageError("invalid", "Name can't be empty.");
  return value;
}

export function downloadName(item: Pick<IMediaItem, "name" | "originalName">) {
  const extension = /\.[^./\\]+$/.exec(item.originalName)?.[0] ?? "";
  return !extension || item.name.toLowerCase().endsWith(extension.toLowerCase())
    ? item.name
    : `${item.name}${extension}`;
}

export function toMediaError(error: unknown): MediaStorageError {
  if (error instanceof MediaStorageError) return error;
  if (error instanceof DOMException && error.name === "QuotaExceededError")
    return new MediaStorageError(
      "quota",
      "Browser storage is full. Free some space and try again.",
    );
  if (error instanceof DOMException && error.name === "NotFoundError")
    return new MediaStorageError("missing", "That media file no longer exists.");
  return new MediaStorageError(
    "unavailable",
    error instanceof Error ? `Media storage failed: ${error.message}` : "Media storage failed.",
  );
}

export function isMediaItem(value: unknown): value is IMediaItem {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.projectId === "string" &&
    isKind(value.kind) &&
    typeof value.name === "string" &&
    typeof value.originalName === "string" &&
    typeof value.type === "string" &&
    typeof value.size === "number" &&
    typeof value.lastModified === "number" &&
    typeof value.addedAt === "number" &&
    typeof value.sha256 === "string"
  );
}

const isTrim = (value: unknown): value is IMediaTrim =>
  isRecord(value) && typeof value.startMs === "number" && typeof value.endMs === "number";

export function isMediaAttachment(value: unknown): value is IMediaAttachment {
  return (
    isRecord(value) &&
    typeof value.projectId === "string" &&
    typeof value.scope === "string" &&
    isKind(value.kind) &&
    typeof value.assetId === "string" &&
    (value.trim === null || isTrim(value.trim))
  );
}
