import { isPattern, isRecord } from "@buzzzz/core";
import type { Pattern } from "@buzzzz/core";

export function readPulsarPattern(value: unknown): Pattern | null {
  if (isPattern(value)) return value;
  if (
    !isRecord(value) ||
    !Array.isArray(value.intensity) ||
    !Array.isArray(value.frequency) ||
    !Array.isArray(value.discrete)
  )
    return null;
  const pattern = {
    continuousPattern: { amplitude: value.intensity, frequency: value.frequency },
    discretePattern: value.discrete.map((event) =>
      isRecord(event)
        ? { time: event.time, amplitude: event.intensity, frequency: event.frequency }
        : event,
    ),
  };
  return isPattern(pattern) ? pattern : null;
}
export function numberIn(value: unknown, maximum: number, label: string) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > maximum)
    throw new Error(`${label} must be between 0 and ${maximum}`);
  return value;
}
