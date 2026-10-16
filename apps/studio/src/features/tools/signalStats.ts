import { patternEnd, type Pattern } from "@buzzzz/core";

type Curve = Pattern["continuousPattern"]["amplitude"];

function curveStats(input: Curve) {
  const points = [...input].sort((a, b) => a.time - b.time);
  let area = 0;
  let squaredArea = 0;
  let activeMs = 0;
  for (let index = 1; index < points.length; index += 1) {
    const before = points[index - 1]!;
    const point = points[index]!;
    const duration = point.time - before.time;
    area += (duration * (point.value + before.value)) / 2;
    squaredArea +=
      (duration * (before.value ** 2 + before.value * point.value + point.value ** 2)) / 3;
    if (before.value > 0.01 && point.value > 0.01) activeMs += duration;
    else if (Math.max(before.value, point.value) > 0.01)
      activeMs +=
        duration *
        ((Math.max(before.value, point.value) - 0.01) / Math.abs(before.value - point.value));
  }
  return { points, area, squaredArea, activeMs };
}

function tightestGap(layers: { time: number }[][]): number | null {
  let gap = Infinity;
  for (const layer of layers) {
    const times = layer.map((point) => point.time).sort((a, b) => a - b);
    for (let index = 1; index < times.length; index += 1)
      gap = Math.min(gap, times[index]! - times[index - 1]!);
  }
  return Number.isFinite(gap) ? gap : null;
}

export function patternStats(pattern: Pattern) {
  const durationMs = patternEnd(pattern);
  const amplitude = curveStats(pattern.continuousPattern.amplitude);
  const frequency = curveStats(pattern.continuousPattern.frequency);
  const taps = [...pattern.discretePattern].sort((a, b) => a.time - b.time);
  const intervals = taps
    .slice(1)
    .map((tap, index) => tap.time - taps[index]!.time)
    .filter((value) => value > 0)
    .sort((a, b) => a - b);
  const envelopePoints = amplitude.points.length + frequency.points.length;
  const frequencyDuration = frequency.points.length
    ? frequency.points.at(-1)!.time - frequency.points[0]!.time
    : 0;
  const tapEnergyMs = taps.reduce((total, tap) => total + tap.amplitude ** 2 * 10, 0);
  return {
    durationMs,
    envelopePoints,
    taps: taps.length,
    peak: Math.max(
      0,
      ...amplitude.points.map((point) => point.value),
      ...taps.map((tap) => tap.amplitude),
    ),
    average: durationMs ? amplitude.area / durationMs : 0,
    dutyCycle: durationMs ? amplitude.activeMs / durationMs : 0,
    meanFrequency: frequencyDuration
      ? frequency.area / frequencyDuration
      : taps.length
        ? taps.reduce((total, tap) => total + tap.frequency, 0) / taps.length
        : null,
    tightestGapMs: tightestGap([taps, amplitude.points, frequency.points]),
    eventsPerSecond: durationMs ? ((envelopePoints + taps.length) * 1000) / durationMs : 0,
    intensityBudget: durationMs
      ? Math.min(1, (amplitude.squaredArea + tapEnergyMs) / durationMs)
      : taps.length
        ? taps.reduce((total, tap) => total + tap.amplitude ** 2, 0) / taps.length
        : 0,
    tempoBpm: intervals.length ? 60000 / intervals[Math.floor(intervals.length / 2)]! : null,
  };
}
