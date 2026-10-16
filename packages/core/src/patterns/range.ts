import { toDevice, type Pattern, type Point } from "./pattern.ts";

function valueAt(points: readonly Point[], time: number): number {
  if (!points.length || time < points[0].time || time > points[points.length - 1].time) return 0;
  const next = points.findIndex((point) => point.time >= time);
  if (next <= 0) return points[0].value;
  const a = points[next - 1];
  const b = points[next];
  return b.time === a.time
    ? b.value
    : a.value + (b.value - a.value) * ((time - a.time) / (b.time - a.time));
}

function crop(points: Point[], start: number, end: number): Point[] {
  if (!points.length || points[0].time > end || points[points.length - 1].time < start) return [];
  const from = Math.max(start, points[0].time);
  const to = Math.min(end, points[points.length - 1].time);
  return [
    { time: from - start, value: valueAt(points, from) },
    ...points
      .filter((p) => p.time > from && p.time < to)
      .map((p) => ({ ...p, time: p.time - start })),
    ...(to > from ? [{ time: to - start, value: valueAt(points, to) }] : []),
  ];
}

export function rangePattern(pattern: Pattern, start: number, end: number): Pattern {
  const sorted = toDevice(pattern);
  const from = Math.max(0, Math.min(start, end));
  const to = Math.max(from, end);
  return {
    discretePattern: sorted.discretePattern
      .filter((p) => p.time >= from && p.time <= to)
      .map((p) => ({ ...p, time: p.time - from })),
    continuousPattern: {
      amplitude: crop(sorted.continuousPattern.amplitude, from, to),
      frequency: crop(sorted.continuousPattern.frequency, from, to),
    },
  };
}
