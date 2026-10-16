import type { Pattern } from "@buzzzz/core";
import type { IAudioAnalysis, IAudioGenerationOptions } from "./model";

type Curve = Pattern["continuousPattern"]["amplitude"];
export const unit = (value: number) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));

export function normalize(values: number[]) {
  let peak = 0;
  for (const value of values) peak = Math.max(peak, value);
  return values.map((value) => (peak > 1e-8 ? unit(value / peak) : 0));
}

export function follow(values: number[], frameMs: number, attackMs: number, releaseMs: number) {
  let envelope = 0;
  return values.map((value) => {
    const time = value > envelope ? attackMs : releaseMs;
    const coefficient = time > 0 ? Math.exp(-frameMs / time) : 0;
    envelope = coefficient * envelope + (1 - coefficient) * value;
    return unit(envelope);
  });
}

function boundCurve(points: Curve, limit: number): Curve {
  if (points.length <= limit) return points;
  const result = [points[0]];
  const buckets = Math.floor((limit - 2) / 2);
  for (let bucket = 0; bucket < buckets; bucket++) {
    const start = 1 + Math.floor((bucket * (points.length - 2)) / buckets);
    const end = 1 + Math.floor(((bucket + 1) * (points.length - 2)) / buckets);
    let minimum = start;
    let maximum = start;
    for (let index = start + 1; index < end; index++) {
      if (points[index].value < points[minimum].value) minimum = index;
      if (points[index].value > points[maximum].value) maximum = index;
    }
    result.push(points[Math.min(minimum, maximum)]);
    if (minimum !== maximum) result.push(points[Math.max(minimum, maximum)]);
  }
  result.push(points[points.length - 1]);
  return result;
}

export function reduceGenerationCurve(input: Curve, tolerance: number, limit = 10000): Curve {
  const points = boundCurve(input, Math.max(2, Math.min(10000, Math.floor(limit))));
  if (points.length < 3) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const ranges = [0, points.length - 1];
  while (ranges.length) {
    const end = ranges.pop();
    const start = ranges.pop();
    if (start === undefined || end === undefined) break;
    const first = points[start];
    const last = points[end];
    let furthest = 0;
    let error = tolerance;
    for (let index = start + 1; index < end; index++) {
      const point = points[index];
      const ratio = (point.time - first.time) / Math.max(1e-8, last.time - first.time);
      const distance = Math.abs(point.value - (first.value + ratio * (last.value - first.value)));
      if (distance > error) {
        error = distance;
        furthest = index;
      }
    }
    if (furthest) {
      keep[furthest] = 1;
      ranges.push(start, furthest, furthest, end);
    }
  }
  return points.filter((_, index) => keep[index]);
}

export function addEnvelope(
  pattern: Pattern,
  analysis: IAudioAnalysis,
  amplitudes: number[],
  frequencies: number[],
  options: IAudioGenerationOptions,
) {
  if (!amplitudes.some((amplitude) => amplitude > 1e-5)) return;
  const smoothing = Math.max(0, Math.min(500, options.smoothingMs ?? 0));
  const tolerance = Math.max(0.001, Math.min(0.2, options.reductionTolerance ?? 0.015));
  const values = smoothing
    ? follow(amplitudes, analysis.frameMs, smoothing, smoothing)
    : amplitudes;
  const amplitude = analysis.frames.map((frame, index) => ({
    time: frame.timeMs,
    value: unit(values[index]),
  }));
  const frequency = analysis.frames.map((frame, index) => ({
    time: frame.timeMs,
    value: unit(frequencies[index]),
  }));
  amplitude.push({ time: analysis.durationMs, value: 0 });
  frequency.push({ time: analysis.durationMs, value: frequency.at(-1)?.value ?? 0.5 });
  pattern.continuousPattern = {
    amplitude: reduceGenerationCurve(amplitude, tolerance),
    frequency: reduceGenerationCurve(frequency, tolerance),
  };
}
