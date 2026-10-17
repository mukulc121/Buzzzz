import type { Pattern } from "@buzzzz/core";
import type { IPlaybackRange, IViewport, PointSelection } from "./model";

export function initialSnippetRange(options: {
  pattern: Pattern;
  selection: readonly PointSelection[];
  viewport: IViewport;
  durationMs: number;
}): IPlaybackRange {
  const { pattern, selection, viewport, durationMs } = options;
  const times = selection.flatMap((point) => {
    const value =
      point.layer === "discrete"
        ? pattern.discretePattern[point.index]
        : pattern.continuousPattern[point.layer][point.index];
    return value ? [value.time] : [];
  });
  if (times.length && Math.max(...times) - Math.min(...times) >= 10)
    return { start: Math.min(...times), end: Math.max(...times) };
  const width = Math.max(10, viewport.durationMs / 2);
  const start = Math.min(
    Math.max(0, viewport.startMs + (viewport.durationMs - width) / 2),
    Math.max(0, durationMs - width),
  );
  return { start: Math.round(start), end: Math.round(Math.min(start + width, durationMs)) };
}

function valueAt(points: Pattern["continuousPattern"]["amplitude"], time: number) {
  const sorted = [...points].sort((a, b) => a.time - b.time);
  const first = sorted[0];
  const last = sorted.at(-1);
  if (!first || !last) return null;
  if (time <= first.time) return first.value;
  if (time >= last.time) return last.value;
  for (let index = 0; index < sorted.length - 1; index++) {
    const from = sorted[index];
    const to = sorted[index + 1];
    if (time >= from.time && time <= to.time && from.time !== to.time)
      return from.value + ((to.value - from.value) * (time - from.time)) / (to.time - from.time);
  }
  return last.value;
}

export function captureSnippetRange(
  pattern: Pattern,
  range: IPlaybackRange,
  valueDecimals: number,
): Pattern | null {
  const start = Math.min(range.start, range.end);
  const end = Math.max(range.start, range.end);
  if (end <= start) return null;
  const clip = (points: Pattern["continuousPattern"]["amplitude"]) => {
    const result = points
      .filter((point) => point.time > start && point.time < end)
      .map((point) => ({ ...point, time: point.time - start }));
    const from = valueAt(points, start);
    const to = valueAt(points, end);
    if (from !== null) result.push({ time: 0, value: Number(from.toFixed(valueDecimals + 2)) });
    if (to !== null)
      result.push({ time: end - start, value: Number(to.toFixed(valueDecimals + 2)) });
    return result.sort((a, b) => a.time - b.time);
  };
  return {
    continuousPattern: {
      amplitude: clip(pattern.continuousPattern.amplitude),
      frequency: clip(pattern.continuousPattern.frequency),
    },
    discretePattern: pattern.discretePattern
      .filter((tap) => tap.time >= start && tap.time <= end)
      .map((tap) => ({ ...tap, time: tap.time - start })),
  };
}

export function normalizeSnippet(pattern: Pattern): Pattern {
  const times = [
    ...pattern.discretePattern,
    ...pattern.continuousPattern.amplitude,
    ...pattern.continuousPattern.frequency,
  ].map((point) => point.time);
  const start = times.length ? Math.min(...times) : 0;
  return {
    discretePattern: pattern.discretePattern.map((tap) => ({ ...tap, time: tap.time - start })),
    continuousPattern: {
      amplitude: pattern.continuousPattern.amplitude.map((point) => ({
        ...point,
        time: point.time - start,
      })),
      frequency: pattern.continuousPattern.frequency.map((point) => ({
        ...point,
        time: point.time - start,
      })),
    },
  };
}
