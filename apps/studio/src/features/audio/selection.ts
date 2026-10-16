import { toDevice } from "@buzzzz/core";
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

// Pulsar's edit check: the pattern differs from the approach last applied to it.
export function isEdited(current: Pattern, applied: Pattern | null) {
  return applied !== null && JSON.stringify(toDevice(current)) !== JSON.stringify(applied);
}
