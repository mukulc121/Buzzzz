import { patternEnd } from "@buzzzz/core";
import type { Pattern } from "react-native-pulsar";

type Point = Pattern["continuousPattern"]["amplitude"][number];

function valueAt(points: readonly Point[], time: number): number {
  if (time <= points[0].time) return points[0].value;
  const next = points.findIndex((point) => point.time > time);
  if (next < 0) return points[points.length - 1].value;
  const left = points[next - 1];
  const right = points[next];
  const span = right.time - left.time;
  return span <= 0
    ? right.value
    : left.value + ((right.value - left.value) * (time - left.time)) / span;
}

function envelopeStartingAt(points: readonly Point[], time: number, remainingMs: number): Point[] {
  if (!points.length) return [];
  const first = { time: 0, value: valueAt(points, time) };
  const later = points
    .filter((point) => point.time > time)
    .map((point) => ({ time: point.time - time, value: point.value }));
  if (later.length) return [first, ...later];
  return remainingMs > 0 ? [first, { ...first, time: remainingMs }] : [first];
}

export function patternStartingAt(pattern: Pattern, time: number): Pattern {
  if (time <= 0) return pattern;
  const remainingMs = patternEnd(pattern) - time;
  const sound = pattern.sound;
  return {
    discretePattern: pattern.discretePattern
      .filter((point) => point.time >= time)
      .map((point) => ({ ...point, time: point.time - time })),
    continuousPattern: {
      amplitude: envelopeStartingAt(pattern.continuousPattern.amplitude, time, remainingMs),
      frequency: envelopeStartingAt(pattern.continuousPattern.frequency, time, remainingMs),
    },
    ...(sound
      ? {
          sound: {
            ...sound,
            start: (sound.start ?? 0) + time,
            duration: sound.duration ? Math.max(0, sound.duration - time) : 0,
          },
        }
      : {}),
  };
}
