import { toDevice } from "@buzzzz/core";
import type { Pattern } from "@buzzzz/core";
import { reduceGenerationCurve, unit } from "./curves";
import type { IAudioGenerationOptions } from "./model";

export const DEFAULT_GENERATION_OPTIONS: Required<IAudioGenerationOptions> = {
  intensity: 1,
  frequencyShift: 0,
  smoothingMs: 0,
  reductionTolerance: 0.015,
  minimumTapStrength: 0.12,
  contrast: 0.3,
  gamma: 0.5,
  silenceFloor: 0.05,
  transientDuck: 0.2,
  envelopeHz: 100,
  maxPoints: 240,
  maxEvents: 120,
};
type Curve = Pattern["continuousPattern"]["amplitude"];

function resample(points: Curve, hz: number): Curve {
  if (!points.length) return [];
  const result: Curve = [];
  const end = points[points.length - 1].time;
  let right = 0;
  for (let time = 0; time < end; time += 1000 / hz) {
    while (right < points.length - 1 && points[right].time < time) right++;
    const after = points[right];
    const before = points[Math.max(0, right - 1)];
    const ratio = Math.max(
      0,
      Math.min(1, (time - before.time) / Math.max(1e-8, after.time - before.time)),
    );
    result.push({ time, value: before.value + (after.value - before.value) * ratio });
  }
  result.push({ ...points[points.length - 1] });
  return result;
}

export function tuneGeneratedPattern(
  pattern: Pattern,
  options: IAudioGenerationOptions,
  transientTimes: readonly number[] = [],
): Pattern {
  for (const [key, value] of Object.entries(options))
    if (
      Object.hasOwn(DEFAULT_GENERATION_OPTIONS, key) &&
      value !== undefined &&
      !Number.isFinite(value)
    )
      throw new Error("Generation settings must be finite numbers");
  const setting = (key: keyof IAudioGenerationOptions) =>
    options[key] ?? DEFAULT_GENERATION_OPTIONS[key];
  const contrast = unit(setting("contrast"));
  const gamma = Math.max(0.3, Math.min(1, setting("gamma")));
  const floor = Math.max(0, Math.min(0.2, setting("silenceFloor")));
  const duck = Math.max(0, Math.min(0.6, setting("transientDuck")));
  const intensity = Math.max(0, Math.min(2, setting("intensity")));
  const hz = Math.max(20, Math.min(200, setting("envelopeHz")));
  const budget = Math.max(2, Math.min(10000, Math.round(setting("maxPoints"))));
  const tolerance = Math.max(0.001, Math.min(0.2, setting("reductionTolerance")));
  const shape = (value: number) =>
    unit(
      (Math.max(0, (unit(value) - floor) / (1 - floor)) ** (1 + 3 * contrast)) ** gamma * intensity,
    );
  let transient = 0;
  const amplitude = resample(pattern.continuousPattern.amplitude, hz).map((point) => {
    while (transient < transientTimes.length - 1 && transientTimes[transient] < point.time)
      transient++;
    const distance = Math.min(
      Math.abs(point.time - (transientTimes[transient] ?? Infinity)),
      Math.abs(point.time - (transientTimes[transient - 1] ?? Infinity)),
    );
    return { time: point.time, value: shape(point.value) * (1 - duck * Math.exp(-distance / 20)) };
  });
  const frequency = resample(pattern.continuousPattern.frequency, hz).map((point) => ({
    time: point.time,
    value: unit(point.value + setting("frequencyShift")),
  }));
  const events = [...pattern.discretePattern]
    .sort((left, right) => right.amplitude - left.amplitude || left.time - right.time)
    .slice(0, Math.max(0, Math.min(10000, Math.round(setting("maxEvents")))));
  return toDevice({
    discretePattern: events.map((tap) => ({
      ...tap,
      amplitude: shape(tap.amplitude),
      frequency: unit(tap.frequency + setting("frequencyShift")),
    })),
    continuousPattern: {
      amplitude: reduceGenerationCurve(amplitude, tolerance, budget),
      frequency: reduceGenerationCurve(frequency, tolerance, budget),
    },
  });
}
