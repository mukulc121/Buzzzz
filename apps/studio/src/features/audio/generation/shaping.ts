import { resampleSeries } from "../signal/envelope";
import { brightnessToHaptic } from "./frequency";
import type { IGenerationOptions, IPulsarEvent, CurvePoint } from "./model";

const CORING = 0.1;
const CURVE_TOLERANCE = 0.02;

const round2 = (value: number) => Number(Math.min(1, Math.max(0, value)).toFixed(2));

// Ramer-Douglas-Peucker on value-over-time.
function simplify(points: CurvePoint[], tolerance: number) {
  if (points.length < 3) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length) {
    const [from, to] = stack.pop()!;
    if (to <= from + 1) continue;
    const start = points[from];
    const end = points[to];
    const span = end.time - start.time;
    const rise = end.value - start.value;
    let worst = 0;
    let index = -1;
    for (let item = from + 1; item < to; item += 1) {
      const point = points[item];
      const expected =
        span === 0 ? start.value : start.value + (rise * (point.time - start.time)) / span;
      const error = Math.abs(point.value - expected);
      if (error > worst) {
        worst = error;
        index = item;
      }
    }
    if (worst > tolerance && index > 0) {
      keep[index] = 1;
      stack.push([from, index], [index, to]);
    }
  }
  return points.filter((_, index) => keep[index] === 1);
}

// Loosens the tolerance until the curve fits the point budget.
function reduceCurve(points: CurvePoint[], maxPoints: number, tolerance: number) {
  let reduced = simplify(points, tolerance);
  while (reduced.length > maxPoints && tolerance < 0.5) {
    tolerance *= 1.6;
    reduced = simplify(points, tolerance);
  }
  return reduced;
}

// Cubic coring: fades small values to nothing while keeping 1 at 1.
function core(value: number, contrast = 0) {
  if (contrast <= 0) return value;
  const cored = (value * value * value) / (CORING + value * value);
  const scaled = Math.min(1, cored * (CORING + 1));
  return value + contrast * (scaled - value);
}

export function intensityCurve(values: Float32Array, stepMs: number, options: IGenerationOptions) {
  const points: CurvePoint[] = [];
  for (let index = 0; index < values.length; index += 1) {
    const value =
      values[index] < options.silenceFloor
        ? 0
        : core(Math.min(1, values[index]), options.contrast) ** options.gamma;
    points.push({ time: Math.round(index * stepMs), value });
  }
  return points.length === 0
    ? []
    : reduceCurve(points, options.maxPoints, 0.01).map((point) => ({
        time: point.time,
        value: round2(point.value),
      }));
}

export function discreteEvents(events: IPulsarEvent[], options: IGenerationOptions) {
  return (
    events.length <= options.maxEvents
      ? events
      : [...events]
          .sort((left, right) => right.intensity - left.intensity)
          .slice(0, options.maxEvents)
  )
    .filter((event) => event.intensity >= options.silenceFloor)
    .sort((left, right) => left.time - right.time)
    .map((event) => ({
      time: Math.round(event.time),
      intensity: round2(event.intensity ** options.gamma),
      frequency: round2(event.frequency),
    }));
}

// Dips the envelope under each tap so the tap reads as an accent.
export function duckUnderEvents(
  values: Float32Array,
  stepMs: number,
  events: IPulsarEvent[],
  depth: number,
  radiusMs = 30,
) {
  if (depth <= 0) return;
  const radius = Math.max(1, Math.round(radiusMs / stepMs));
  for (const event of events) {
    const center = Math.round(event.time / stepMs);
    for (let index = center - radius; index <= center + radius; index += 1) {
      if (index < 0 || index >= values.length) continue;
      const weight = 1 - Math.abs(index - center) / (radius + 1);
      values[index] *= 1 - depth * weight;
    }
  }
}

// Exponentially decaying stamp, max-combined into the envelope.
export function stampDecay(
  values: Float32Array,
  stepMs: number,
  timeMs: number,
  intensity: number,
  decayMs = 90,
) {
  const start = Math.round(timeMs / stepMs);
  const length = Math.ceil((decayMs * 3) / stepMs);
  for (let offset = 0; offset <= length; offset += 1) {
    const index = start + offset;
    if (index < 0 || index >= values.length) continue;
    const value = intensity * Math.exp((-offset * stepMs) / decayMs);
    if (value > values[index]) values[index] = value;
  }
}

export function flatCurve(value: number, durationMs: number) {
  return [
    { time: 0, value: round2(value) },
    { time: Math.round(durationMs), value: round2(value) },
  ];
}

const seriesPoints = (values: Float32Array, stepMs: number) =>
  Array.from(values, (value, index) => ({ time: Math.round(index * stepMs), value }));

// Resampled, reduced and clamped frequency curve.
export function frequencyCurve(
  values: Float32Array,
  stepMs: number,
  durationMs: number,
  options: IGenerationOptions,
) {
  if (values.length === 0) return [];
  const resampled = resampleSeries(values, stepMs, durationMs, options.envelopeHz);
  return reduceCurve(
    seriesPoints(resampled.values, resampled.stepMs),
    options.maxPoints,
    CURVE_TOLERANCE,
  ).map((point) => ({ time: point.time, value: round2(point.value) }));
}

// Reduced frequency curve already on the envelope grid, rounded but not clamped.
export function gridFrequencyCurve(
  values: Float32Array,
  stepMs: number,
  options: IGenerationOptions,
) {
  return reduceCurve(seriesPoints(values, stepMs), options.maxPoints, CURVE_TOLERANCE).map(
    (point) => ({ time: point.time, value: Number(point.value.toFixed(2)) }),
  );
}

export function brightnessCurve(
  centroidHz: Float32Array,
  stepMs: number,
  durationMs: number,
  options: IGenerationOptions,
) {
  return frequencyCurve(brightnessToHaptic(centroidHz), stepMs, durationMs, options);
}

export function mean(values: Float32Array) {
  if (values.length === 0) return 0;
  let sum = 0;
  for (const value of values) sum += value;
  return sum / values.length;
}
