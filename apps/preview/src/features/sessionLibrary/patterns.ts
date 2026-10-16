import { patternEnd } from "@buzzzz/core";
import type { ICachedPattern, IPatternLibrary } from "./model";

export function listCachedPatterns(
  library: IPatternLibrary,
  connectionId: string,
): ICachedPattern[] {
  const records = Object.hasOwn(library, connectionId) ? library[connectionId] : [];
  return [...records].sort((left, right) => right.receivedAt - left.receivedAt);
}

export function cachePattern(
  library: IPatternLibrary,
  connectionId: string,
  packet: Pick<ICachedPattern, "resourceId" | "name" | "version" | "pattern">,
  receivedAt: number,
): IPatternLibrary {
  const { pattern } = packet;
  const record: ICachedPattern = {
    resourceId: packet.resourceId,
    name: packet.name,
    kind: "pattern",
    version: packet.version,
    durationMs: patternEnd(pattern),
    pattern: {
      discretePattern: pattern.discretePattern.map((point) => ({ ...point })),
      continuousPattern: {
        amplitude: pattern.continuousPattern.amplitude.map((point) => ({ ...point })),
        frequency: pattern.continuousPattern.frequency.map((point) => ({ ...point })),
      },
    },
    receivedAt,
  };
  const records = listCachedPatterns(library, connectionId).filter(
    (item) => item.resourceId !== packet.resourceId,
  );
  return {
    ...library,
    [connectionId]: [...records, record].sort((left, right) => right.receivedAt - left.receivedAt),
  };
}

export function renameCachedPatterns(
  library: IPatternLibrary,
  connectionId: string,
  manifest: readonly Pick<ICachedPattern, "resourceId" | "name">[],
): IPatternLibrary {
  if (!Object.hasOwn(library, connectionId)) return library;
  const names = new Map(manifest.map((item) => [item.resourceId, item.name]));
  let changed = false;
  const records = library[connectionId].map((record) => {
    const name = names.get(record.resourceId);
    if (!name || name === record.name) return record;
    changed = true;
    return { ...record, name };
  });
  return changed ? { ...library, [connectionId]: records } : library;
}

export function removeCachedPattern(
  library: IPatternLibrary,
  connectionId: string,
  resourceId: string,
): IPatternLibrary {
  if (!Object.hasOwn(library, connectionId)) return library;
  const records = library[connectionId].filter((record) => record.resourceId !== resourceId);
  return records.length === library[connectionId].length
    ? library
    : { ...library, [connectionId]: records };
}

export function purgeCachedConnection(
  library: IPatternLibrary,
  connectionId: string,
): IPatternLibrary {
  if (!Object.hasOwn(library, connectionId)) return library;
  return Object.fromEntries(Object.entries(library).filter(([id]) => id !== connectionId));
}
