export type Tap = { time: number; amplitude: number; frequency: number };
export type Point = { time: number; value: number };
export type Pattern = {
  discretePattern: Tap[];
  continuousPattern: { amplitude: Point[]; frequency: Point[] };
};
export const MAX_PATTERN_MS = 60_000;
const MAX_POINTS = 10_000;
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
const finiteIn = (value: unknown, max: number): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= max;
const isPoint = (value: unknown): value is Point =>
  isRecord(value) && finiteIn(value.time, MAX_PATTERN_MS) && finiteIn(value.value, 1);
const isTap = (value: unknown): value is Tap =>
  isRecord(value) &&
  finiteIn(value.time, MAX_PATTERN_MS) &&
  finiteIn(value.amplitude, 1) &&
  finiteIn(value.frequency, 1);
const boundedArray = <T>(value: unknown, check: (item: unknown) => item is T): value is T[] =>
  Array.isArray(value) && value.length <= MAX_POINTS && value.every(check);
export function isPattern(value: unknown): value is Pattern {
  return (
    isRecord(value) &&
    boundedArray(value.discretePattern, isTap) &&
    isRecord(value.continuousPattern) &&
    boundedArray(value.continuousPattern.amplitude, isPoint) &&
    boundedArray(value.continuousPattern.frequency, isPoint)
  );
}
export const emptyPattern = (): Pattern => ({
  discretePattern: [],
  continuousPattern: { amplitude: [], frequency: [] },
});
const byTime = (a: { time: number }, b: { time: number }) => a.time - b.time;
const unit = (n: number) => Math.round(Math.min(1, Math.max(0, n)) * 10000) / 10000;
const time = (n: number) => Math.round(Math.min(MAX_PATTERN_MS, Math.max(0, n)));
export function toDevice(pattern: Pattern): Pattern {
  const point = (p: Point) => ({ time: time(p.time), value: unit(p.value) });
  return {
    discretePattern: [...pattern.discretePattern].sort(byTime).map((tap) => ({
      time: time(tap.time),
      amplitude: unit(tap.amplitude),
      frequency: unit(tap.frequency),
    })),
    continuousPattern: {
      amplitude: [...pattern.continuousPattern.amplitude].sort(byTime).map(point),
      frequency: [...pattern.continuousPattern.frequency].sort(byTime).map(point),
    },
  };
}
export function patternEnd(pattern: Pattern): number {
  let end = 0;
  for (const points of [
    pattern.discretePattern,
    pattern.continuousPattern.amplitude,
    pattern.continuousPattern.frequency,
  ]) {
    for (const point of points) end = Math.max(end, point.time);
  }
  return end;
}
