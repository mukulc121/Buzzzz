import { isPattern, isRecord, MAX_PATTERN_MS } from "@buzzzz/core";
import type { ICachedPattern, IPatternLibrary } from "./model";

function readRecord(value: unknown): ICachedPattern {
  if (
    !isRecord(value) ||
    value.kind !== "pattern" ||
    typeof value.resourceId !== "string" ||
    !value.resourceId ||
    value.resourceId.length > 512 ||
    typeof value.name !== "string" ||
    value.name.length > 512 ||
    typeof value.version !== "string" ||
    value.version.length > 512 ||
    typeof value.durationMs !== "number" ||
    !Number.isFinite(value.durationMs) ||
    value.durationMs < 0 ||
    value.durationMs > MAX_PATTERN_MS ||
    typeof value.receivedAt !== "number" ||
    !Number.isFinite(value.receivedAt) ||
    value.receivedAt < 0 ||
    !isPattern(value.pattern)
  )
    throw new Error("A saved Studio pattern is invalid");
  return {
    resourceId: value.resourceId,
    name: value.name,
    kind: "pattern",
    version: value.version,
    durationMs: value.durationMs,
    pattern: value.pattern,
    receivedAt: value.receivedAt,
  };
}

export function decodePatternLibrary(text: string | null): IPatternLibrary {
  if (text === null) return {};
  const value: unknown = JSON.parse(text);
  if (!isRecord(value)) throw new Error("The saved Studio library is invalid");
  return Object.fromEntries(
    Object.entries(value).map(([connectionId, items]) => {
      if (!connectionId || !Array.isArray(items))
        throw new Error("A saved Studio connection is invalid");
      const records = new Map<string, ICachedPattern>();
      for (const item of items) {
        const record = readRecord(item);
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
