import { isPattern, isRecord, toDevice } from "@buzzzz/core";
import type { Pattern } from "@buzzzz/core";
import { numberIn } from "./pattern";

export function readLofelt(value: unknown): Pattern | null {
  if (!isRecord(value) || !isRecord(value.signals)) return null;
  if (
    !isRecord(value.version) ||
    value.version.major !== 1 ||
    !Number.isInteger(value.version.minor) ||
    !Number.isInteger(value.version.patch)
  )
    throw new Error("Only version 1 Lofelt haptic files are supported");
  numberIn(value.version.minor, Number.MAX_SAFE_INTEGER, "Haptic minor version");
  numberIn(value.version.patch, Number.MAX_SAFE_INTEGER, "Haptic patch version");
  const continuous = value.signals.continuous;
  if (!isRecord(continuous) || !isRecord(continuous.envelopes))
    throw new Error("The haptic file has no continuous envelopes");
  const { amplitude, frequency = [] } = continuous.envelopes;
  if (
    !Array.isArray(amplitude) ||
    amplitude.length < 2 ||
    amplitude.length > 10000 ||
    !Array.isArray(frequency) ||
    frequency.length > 10000
  )
    throw new Error(
      "Haptic envelopes must have 2–10,000 amplitude points and at most 10,000 frequency points",
    );
  const pattern: Pattern = {
    discretePattern: [],
    continuousPattern: { amplitude: [], frequency: [] },
  };
  let previous = -1;
  for (const point of amplitude) {
    if (!isRecord(point)) throw new Error("Invalid amplitude breakpoint");
    const time = numberIn(point.time, 60, "Haptic time") * 1000;
    const strength = numberIn(point.amplitude, 1, "Amplitude");
    if (time < previous) throw new Error("Haptic breakpoints must be sorted by time");
    previous = time;
    pattern.continuousPattern.amplitude.push({ time, value: strength });
    if (point.emphasis !== undefined) {
      if (!isRecord(point.emphasis)) throw new Error("Invalid haptic emphasis");
      pattern.discretePattern.push({
        time,
        amplitude: numberIn(point.emphasis.amplitude, 1, "Emphasis amplitude"),
        frequency: numberIn(point.emphasis.frequency, 1, "Emphasis frequency"),
      });
    }
  }
  if (previous <= pattern.continuousPattern.amplitude[0].time)
    throw new Error("A haptic envelope must have a positive duration");
  previous = -1;
  const end = pattern.continuousPattern.amplitude.at(-1)?.time ?? 0;
  for (const point of frequency) {
    if (!isRecord(point)) throw new Error("Invalid frequency breakpoint");
    const time = numberIn(point.time, 60, "Haptic time") * 1000;
    if (time < previous || time > end)
      throw new Error("Frequency breakpoints must be sorted and within the amplitude duration");
    previous = time;
    pattern.continuousPattern.frequency.push({
      time,
      value: numberIn(point.frequency, 1, "Frequency"),
    });
  }
  if (!isPattern(pattern))
    throw new Error("The converted haptic pattern exceeds the supported limits");
  return toDevice(pattern);
}
