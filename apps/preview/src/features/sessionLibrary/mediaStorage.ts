import { isPattern, isRecord, MAX_PATTERN_MS } from "@buzzzz/core";
import type { ICachedMedia, ICachedResource, IMediaLibrary } from "./mediaModel";
import { isMediaClipPath, storedMediaClipPath } from "./mediaPaths";
import { decodePatternLibrary } from "./patternStorage";

const text = (value: unknown, nonempty = false): value is string =>
  typeof value === "string" && value.length <= 512 && (!nonempty || value.length > 0);
const finite = (value: unknown, maximum = Number.MAX_SAFE_INTEGER): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= maximum;
const optional = (value: unknown, maximum?: number): value is number | undefined =>
  value === undefined || finite(value, maximum);

function isAnimation(value: unknown): value is NonNullable<ICachedMedia["animation"]> {
  return (
    isRecord(value) &&
    finite(value.totalFrames) &&
    finite(value.frameRate) &&
    value.frameRate > 0 &&
    finite(value.width) &&
    value.width > 0 &&
    finite(value.height) &&
    value.height > 0
  );
}

export function readCachedMedia(value: Record<string, unknown>): ICachedMedia {
  const clipPath = storedMediaClipPath(value);
  const animation = value.animation;
  if (
    (value.kind !== "audio" && value.kind !== "animation") ||
    !text(value.resourceId, true) ||
    !text(value.name) ||
    !text(value.version) ||
    !text(value.clipId, true) ||
    !isMediaClipPath(clipPath) ||
    !text(value.contentType, true) ||
    !finite(value.sizeBytes) ||
    !finite(value.durationMs, MAX_PATTERN_MS) ||
    !finite(value.receivedAt) ||
    !isPattern(value.pattern) ||
    !optional(value.volume, 1) ||
    !optional(value.offset, MAX_PATTERN_MS) ||
    !optional(value.soundStartMs) ||
    !optional(value.soundDurationMs) ||
    (animation !== undefined && !isAnimation(animation))
  )
    throw new Error("A saved Studio media resource is invalid");
  return {
    resourceId: value.resourceId,
    name: value.name,
    kind: value.kind,
    version: value.version,
    clipId: value.clipId,
    clipPath,
    contentType: value.contentType,
    sizeBytes: value.sizeBytes,
    durationMs: value.durationMs,
    pattern: value.pattern,
    ...(value.volume !== undefined ? { volume: value.volume } : {}),
    ...(value.offset !== undefined ? { offset: value.offset } : {}),
    ...(value.soundStartMs !== undefined ? { soundStartMs: value.soundStartMs } : {}),
    ...(value.soundDurationMs !== undefined ? { soundDurationMs: value.soundDurationMs } : {}),
    ...(animation === undefined
      ? {}
      : {
          animation: {
            totalFrames: animation.totalFrames,
            frameRate: animation.frameRate,
            width: animation.width,
            height: animation.height,
          },
        }),
    receivedAt: value.receivedAt,
  };
}

export function decodeMediaLibrary(text: string | null): IMediaLibrary {
  if (text === null) return {};
  const value: unknown = JSON.parse(text);
  if (!isRecord(value)) throw new Error("The saved Studio library is invalid");
  return Object.fromEntries(
    Object.entries(value).map(([connectionId, items]) => {
      if (!connectionId || !Array.isArray(items))
        throw new Error("A saved Studio connection is invalid");
      const records = new Map<string, ICachedResource>();
      for (const item of items) {
        if (!isRecord(item)) throw new Error("A saved Studio resource is invalid");
        const record =
          item.kind === "pattern"
            ? decodePatternLibrary(JSON.stringify({ connection: [item] })).connection[0]
            : readCachedMedia(item);
        const previous = records.get(record.resourceId);
        if (!previous || record.receivedAt >= previous.receivedAt)
          records.set(record.resourceId, record);
      }
      return [
        connectionId,
        [...records.values()].sort((left, right) => right.receivedAt - left.receivedAt),
      ];
    }),
  );
}

export function listMediaResources(library: IMediaLibrary, connectionId: string) {
  return Object.hasOwn(library, connectionId) ? library[connectionId] : [];
}

export function upsertMediaResource(
  library: IMediaLibrary,
  connectionId: string,
  record: ICachedResource,
): IMediaLibrary {
  return {
    ...library,
    [connectionId]: [
      record,
      ...listMediaResources(library, connectionId).filter(
        (previous) => previous.resourceId !== record.resourceId,
      ),
    ].sort((left, right) => right.receivedAt - left.receivedAt),
  };
}

export function renameMediaResources(
  library: IMediaLibrary,
  connectionId: string,
  presets: readonly { resourceId: string; name: string }[],
): IMediaLibrary {
  const names = new Map(presets.map((preset) => [preset.resourceId, preset.name]));
  let changed = false;
  const records = listMediaResources(library, connectionId).map((record) => {
    const name = names.get(record.resourceId);
    if (!name || name === record.name) return record;
    changed = true;
    return { ...record, name };
  });
  return changed ? { ...library, [connectionId]: records } : library;
}

export function removeMediaResource(
  library: IMediaLibrary,
  connectionId: string,
  resourceId: string,
): IMediaLibrary {
  const records = listMediaResources(library, connectionId);
  const retained = records.filter((record) => record.resourceId !== resourceId);
  return retained.length === records.length ? library : { ...library, [connectionId]: retained };
}

export function purgeMediaConnection(library: IMediaLibrary, connectionId: string): IMediaLibrary {
  return Object.hasOwn(library, connectionId)
    ? Object.fromEntries(Object.entries(library).filter(([id]) => id !== connectionId))
    : library;
}
