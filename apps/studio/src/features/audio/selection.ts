import type { Pattern } from "@buzzzz/core";

export function deriveAudioReplacement(
  current: Pattern,
  next: Pattern,
  lastApplied: Pattern | null,
): "unchanged" | "replace" | "confirm" {
  const serialized = JSON.stringify(current);
  if (serialized === JSON.stringify(next)) return "unchanged";
  if (
    !current.discretePattern.length &&
    !current.continuousPattern.amplitude.length &&
    !current.continuousPattern.frequency.length
  )
    return "replace";
  if (lastApplied && serialized === JSON.stringify(lastApplied)) return "replace";
  return "confirm";
}
