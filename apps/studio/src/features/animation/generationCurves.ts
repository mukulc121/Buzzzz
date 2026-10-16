import type { Pattern } from "@buzzzz/core";
import type { IAnimationGenerationOptions } from "./model";

type Curve = Pattern["continuousPattern"]["amplitude"];
type Events = Pattern["discretePattern"];
export const unit = (value: number) => Math.min(1, Math.max(0, value));
const rounded = (value: number) => Number(unit(value).toFixed(2));

function simplify(points: Curve, tolerance: number): Curve {
  if (points.length < 3) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const pending = [[0, points.length - 1]];
  while (pending.length) {
    const range = pending.pop();
    if (!range) break;
    const [start, end] = range;
    let error = 0;
    let split = -1;
    for (let index = start + 1; index < end; index++) {
      const left = points[start];
      const right = points[end];
      const expected =
        right.time === left.time
          ? left.value
          : left.value +
            ((right.value - left.value) * (points[index].time - left.time)) /
              (right.time - left.time);
      const distance = Math.abs(points[index].value - expected);
      if (distance > error) {
        error = distance;
        split = index;
      }
    }
    if (error > tolerance && split > 0) {
      keep[split] = 1;
      pending.push([start, split], [split, end]);
    }
  }
  return points.filter((_, index) => keep[index] === 1);
}

export function animationCurve(
  values: Float32Array,
  frameMs: number,
  options: IAnimationGenerationOptions,
  frequency = false,
): Curve {
  const points = Array.from(values, (value, index) => {
    let shaped = unit(value);
    if (!frequency) {
      const compressed = Math.min(1, (1.1 * shaped ** 3) / (0.1 + shaped ** 2));
      shaped =
        value < (options.silenceFloor ?? 0.05)
          ? 0
          : (shaped + (options.contrast ?? 0.3) * (compressed - shaped)) ** (options.gamma ?? 0.5);
    }
    return { time: Math.round(index * frameMs), value: shaped };
  });
  let tolerance = frequency ? 0.02 : 0.01;
  let reduced = simplify(points, tolerance);
  while (reduced.length > (options.maxPoints ?? 240) && tolerance < 0.5) {
    tolerance *= 1.6;
    reduced = simplify(points, tolerance);
  }
  return reduced.map((point) => ({ time: point.time, value: rounded(point.value) }));
}

export function animationEvents(events: Events, options: IAnimationGenerationOptions): Events {
  const limited =
    events.length > (options.maxEvents ?? 120)
      ? [...events].sort((a, b) => b.amplitude - a.amplitude).slice(0, options.maxEvents ?? 120)
      : events;
  return limited
    .filter((event) => event.amplitude >= (options.silenceFloor ?? 0.05))
    .sort((a, b) => a.time - b.time)
    .map((event) => ({
      time: Math.round(event.time),
      amplitude: rounded(event.amplitude ** (options.gamma ?? 0.5)),
      frequency: rounded(event.frequency),
    }));
}

export function duckAnimationEnvelope(
  values: Float32Array,
  frameMs: number,
  events: Events,
  depth: number,
) {
  const radius = Math.max(1, Math.round(30 / frameMs));
  for (const event of events) {
    const center = Math.round(event.time / frameMs);
    for (let index = center - radius; index <= center + radius; index++)
      if (index >= 0 && index < values.length)
        values[index] *= 1 - depth * (1 - Math.abs(index - center) / (radius + 1));
  }
}
