import { emptyPattern, isPattern, type Pattern } from "@buzzzz/core";
import { LAYERS, type Layer, type PointSelection } from "./model";

export interface IChartClipboard {
  pattern: Pattern;
  width: number;
}

export type TPasteMode = "both" | "amplitude" | "frequency";

function valueAt(points: Pattern["continuousPattern"]["amplitude"], time: number) {
  const sorted = [...points].sort((a, b) => a.time - b.time);
  if (!sorted.length) return null;
  if (time <= sorted[0].time) return sorted[0].value;
  const last = sorted[sorted.length - 1];
  if (time >= last.time) return last.value;
  for (let index = 0; index < sorted.length - 1; index++) {
    const left = sorted[index];
    const right = sorted[index + 1];
    if (time >= left.time && time <= right.time && right.time !== left.time)
      return (
        left.value + ((time - left.time) / (right.time - left.time)) * (right.value - left.value)
      );
  }
  return last.value;
}

export function copyChartRange(options: {
  pattern: Pattern;
  selection: readonly PointSelection[];
  valueDecimals: number;
}): IChartClipboard | null {
  const { pattern, selection, valueDecimals } = options;
  const times = selection.flatMap((point) => {
    const value =
      point.layer === "discrete"
        ? pattern.discretePattern[point.index]
        : pattern.continuousPattern[point.layer][point.index];
    return value ? [value.time] : [];
  });
  if (!times.length) return null;
  const start = Math.min(...times);
  const end = Math.max(...times);
  const width = end - start;
  const copy = emptyPattern();
  for (const layer of ["amplitude", "frequency"] satisfies Layer[]) {
    const points = pattern.continuousPattern[layer];
    const clipped = points
      .filter((point) => point.time > start && point.time < end)
      .map((point) => ({ ...point, time: point.time - start }));
    const first = valueAt(points, start);
    if (first !== null) clipped.push({ time: 0, value: Number(first.toFixed(valueDecimals + 2)) });
    const last = valueAt(points, end);
    if (width > 0 && last !== null)
      clipped.push({ time: width, value: Number(last.toFixed(valueDecimals + 2)) });
    copy.continuousPattern[layer] = clipped.sort((a, b) => a.time - b.time);
  }
  copy.discretePattern = pattern.discretePattern
    .filter((point) => point.time >= start && point.time <= end)
    .map((point) => ({ ...point, time: point.time - start }));
  return { pattern: copy, width };
}

export function pasteLayers(mode: TPasteMode): readonly Layer[] {
  return mode === "both" ? LAYERS : [mode];
}

export function applyChartPaste(options: {
  pattern: Pattern;
  clipboard: IChartClipboard;
  startMs: number;
  mode: TPasteMode;
}): Pattern {
  const { clipboard, mode } = options;
  const start = Math.max(0, Math.round(options.startMs));
  if (!Number.isFinite(start)) throw new Error("Choose a valid paste time.");
  const end = start + clipboard.width;
  const next = structuredClone(options.pattern);
  for (const layer of pasteLayers(mode)) {
    if (layer === "discrete") {
      if (clipboard.pattern.discretePattern.length)
        next.discretePattern = [
          ...next.discretePattern.filter((point) => point.time < start || point.time > end),
          ...clipboard.pattern.discretePattern.map((point) => ({
            ...point,
            time: start + point.time,
          })),
        ].sort((a, b) => a.time - b.time);
    } else if (clipboard.pattern.continuousPattern[layer].length)
      next.continuousPattern[layer] = [
        ...next.continuousPattern[layer].filter((point) => point.time < start || point.time > end),
        ...clipboard.pattern.continuousPattern[layer].map((point) => ({
          ...point,
          time: start + point.time,
        })),
      ].sort((a, b) => a.time - b.time);
  }
  if (!isPattern(next)) throw new Error("This edit exceeds the pattern point limit.");
  return next;
}
