import { isPattern, MAX_PATTERN_MS, patternEnd, toDevice, type Pattern } from "@buzzzz/core";

export function insertLibraryPattern(current: Pattern, incoming: Pattern, timeMs: number): Pattern {
  const start = Math.max(0, Math.round(timeMs));
  const end = start + Math.ceil(patternEnd(incoming));
  if (!Number.isFinite(start) || end > MAX_PATTERN_MS)
    throw new Error("Patterns must fit within 60 seconds");
  const insert = <T extends { time: number }>(target: T[], source: T[]): T[] => {
    const preserved = source.length
      ? target.filter((point) => point.time < start || point.time > end)
      : target;
    return [
      ...preserved.map((point) => ({ ...point })),
      ...source.map((point) => ({ ...point, time: start + point.time })),
    ].sort((a, b) => a.time - b.time);
  };
  const normalized = toDevice(incoming);
  const pattern: Pattern = {
    continuousPattern: {
      amplitude: insert(
        current.continuousPattern.amplitude,
        normalized.continuousPattern.amplitude,
      ),
      frequency: insert(
        current.continuousPattern.frequency,
        normalized.continuousPattern.frequency,
      ),
    },
    discretePattern: insert(current.discretePattern, normalized.discretePattern),
  };
  if (!isPattern(pattern)) throw new Error("This insertion exceeds the pattern limits");
  return pattern;
}
