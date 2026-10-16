import { isRecord } from "@buzzzz/core";
import type { IAnimationChannel, IAnimationKeyframe } from "./model";

const numbers = (value: unknown): number[] =>
  typeof value === "number" && Number.isFinite(value)
    ? [value]
    : Array.isArray(value)
      ? value.filter((item): item is number => typeof item === "number" && Number.isFinite(item))
      : [];
function easing(value: unknown) {
  if (!isRecord(value)) return undefined;
  const x = numbers(value.x);
  const y = numbers(value.y);
  return x.length && y.length ? { x, y } : undefined;
}

export function parseChannel(value: unknown, fallback: number[]): IAnimationChannel {
  if (!isRecord(value)) return { value: fallback, keys: [] };
  if (value.a !== 1 && (!Array.isArray(value.k) || typeof value.k[0] !== "object"))
    return { value: numbers(value.k).length ? numbers(value.k) : fallback, keys: [] };
  if (!Array.isArray(value.k) || value.k.length > 10000)
    throw new Error("An animation channel contains too many keyframes");
  const keys: IAnimationKeyframe[] = [];
  for (const key of value.k) {
    if (!isRecord(key) || typeof key.t !== "number" || !Number.isFinite(key.t))
      throw new Error("Animation keyframe times must be finite numbers");
    keys.push({
      time: key.t,
      start: numbers(key.s),
      end: numbers(key.e),
      hold: key.h === 1,
      incoming: easing(key.i),
      outgoing: easing(key.o),
      spatialIn: numbers(key.ti),
      spatialOut: numbers(key.to),
    });
  }
  keys.sort((left, right) => left.time - right.time);
  for (let index = 0; index < keys.length; index++) {
    const key = keys[index];
    if (!key.start.length)
      key.start = keys[index - 1]?.end?.length
        ? (keys[index - 1].end ?? fallback)
        : (keys[index - 1]?.start ?? fallback);
  }
  return { value: fallback, keys };
}

const bezier = (a: number, b: number, time: number) =>
  3 * (1 - time) ** 2 * time * a + 3 * (1 - time) * time ** 2 * b + time ** 3;
function ease(key: IAnimationKeyframe, next: IAnimationKeyframe, ratio: number, dimension: number) {
  const x1 = key.outgoing?.x[dimension] ?? key.outgoing?.x[0] ?? 0;
  const y1 = key.outgoing?.y[dimension] ?? key.outgoing?.y[0] ?? 0;
  const x2 = next.incoming?.x[dimension] ?? next.incoming?.x[0] ?? 1;
  const y2 = next.incoming?.y[dimension] ?? next.incoming?.y[0] ?? 1;
  if (Math.abs(x1 - y1) < 1e-4 && Math.abs(x2 - y2) < 1e-4) return ratio;
  let progress = ratio;
  for (let iteration = 0; iteration < 8; iteration++) {
    const error = bezier(x1, x2, progress) - ratio;
    if (Math.abs(error) < 1e-6) return bezier(y1, y2, progress);
    const slope =
      3 * (1 - progress) ** 2 * x1 +
      6 * (1 - progress) * progress * (x2 - x1) +
      3 * progress ** 2 * (1 - x2);
    if (Math.abs(slope) < 1e-6) break;
    progress = Math.min(1, Math.max(0, progress - error / slope));
  }
  let low = 0;
  let high = 1;
  for (let iteration = 0; iteration < 20; iteration++) {
    progress = (low + high) / 2;
    const value = bezier(x1, x2, progress);
    if (Math.abs(value - ratio) < 1e-6) break;
    if (value < ratio) low = progress;
    else high = progress;
  }
  return bezier(y1, y2, progress);
}

export function sampleChannel(
  channel: IAnimationChannel,
  frame: number,
  sharedProgress = false,
): number[] {
  const keys = channel.keys;
  if (!keys.length) return channel.value;
  let low = 0;
  let high = keys.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (keys[middle].time <= frame) low = middle + 1;
    else high = middle;
  }
  const index = Math.max(0, low - 1);
  const key = keys[index];
  const next = keys[index + 1];
  if (!next || key.hold || frame <= key.time) return key.start;
  const end = key.end?.length ? key.end : next.start;
  const ratio = Math.max(0, Math.min(1, (frame - key.time) / (next.time - key.time)));
  return key.start.map((start, dimension) => {
    const finish = end[dimension] ?? start;
    const progress = ease(
      key,
      next,
      ratio,
      sharedProgress || (key.spatialOut && next.spatialIn) ? 0 : dimension,
    );
    const outgoing = key.spatialOut?.[dimension];
    const incoming = next.spatialIn?.[dimension];
    if (outgoing !== undefined && incoming !== undefined)
      return (
        (1 - progress) ** 3 * start +
        3 * (1 - progress) ** 2 * progress * (start + outgoing) +
        3 * (1 - progress) * progress ** 2 * (finish + incoming) +
        progress ** 3 * finish
      );
    return start + (finish - start) * progress;
  });
}
