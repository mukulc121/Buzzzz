import { emptyPattern, isPattern, MAX_PATTERN_MS, patternEnd, type Pattern } from "@buzzzz/core";
import { LAYERS, selectionKey, type ISelectionBounds, type PointSelection } from "./model";
import { quantizeValue } from "./editorSettings";

interface IEditSelection {
  pattern: Pattern;
  selection: readonly PointSelection[];
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function selectedPoints(props: IEditSelection) {
  const { pattern, selection } = props;
  const seen = new Set<string>();
  return selection.flatMap((item) => {
    const key = selectionKey(item);
    const point =
      item.layer === "discrete"
        ? pattern.discretePattern[item.index]
        : pattern.continuousPattern[item.layer][item.index];
    if (!point || seen.has(key)) return [];
    seen.add(key);
    return [{ ...item, time: point.time, value: "value" in point ? point.value : point.amplitude }];
  });
}

function indices(selection: readonly PointSelection[]) {
  return {
    amplitude: new Set(
      selection.filter((item) => item.layer === "amplitude").map((item) => item.index),
    ),
    frequency: new Set(
      selection.filter((item) => item.layer === "frequency").map((item) => item.index),
    ),
    discrete: new Set(
      selection.filter((item) => item.layer === "discrete").map((item) => item.index),
    ),
  };
}

export function deleteSelection(props: IEditSelection): Pattern {
  const { pattern, selection } = props;
  const selected = indices(selection);
  return {
    discretePattern: pattern.discretePattern.filter((_, index) => !selected.discrete.has(index)),
    continuousPattern: {
      amplitude: pattern.continuousPattern.amplitude.filter(
        (_, index) => !selected.amplitude.has(index),
      ),
      frequency: pattern.continuousPattern.frequency.filter(
        (_, index) => !selected.frequency.has(index),
      ),
    },
  };
}

export function moveSelection(
  props: IEditSelection & { timeMs: number; value: number; valueDecimals?: number },
): Pattern {
  const { pattern, selection, timeMs, value } = props;
  const points = selectedPoints(props);
  if (!points.length) return pattern;
  const timeDelta = clamp(
    Number.isFinite(timeMs) ? Math.round(timeMs) : 0,
    -Math.min(...points.map((point) => point.time)),
    MAX_PATTERN_MS - Math.max(...points.map((point) => point.time)),
  );
  const valueDelta = clamp(
    Number.isFinite(value) ? value : 0,
    -Math.min(...points.map((point) => point.value)),
    1 - Math.max(...points.map((point) => point.value)),
  );
  const selected = indices(selection);
  const movedValue = (value: number) =>
    props.valueDecimals !== undefined && valueDelta !== 0
      ? quantizeValue(value + valueDelta, props.valueDecimals)
      : value + valueDelta;
  return {
    discretePattern: pattern.discretePattern.map((point, index) =>
      selected.discrete.has(index)
        ? { ...point, time: point.time + timeDelta, amplitude: movedValue(point.amplitude) }
        : point,
    ),
    continuousPattern: {
      amplitude: pattern.continuousPattern.amplitude.map((point, index) =>
        selected.amplitude.has(index)
          ? { time: point.time + timeDelta, value: movedValue(point.value) }
          : point,
      ),
      frequency: pattern.continuousPattern.frequency.map((point, index) =>
        selected.frequency.has(index)
          ? { time: point.time + timeDelta, value: movedValue(point.value) }
          : point,
      ),
    },
  };
}

export function copySelection(props: IEditSelection): Pattern {
  const points = selectedPoints(props);
  const result = emptyPattern();
  if (!points.length) return result;
  const start = Math.min(...points.map((point) => point.time));
  for (const item of points) {
    if (item.layer === "discrete") {
      const point = props.pattern.discretePattern[item.index];
      result.discretePattern.push({ ...point, time: point.time - start });
    } else {
      const point = props.pattern.continuousPattern[item.layer][item.index];
      result.continuousPattern[item.layer].push({ ...point, time: point.time - start });
    }
  }
  return result;
}

export function pasteSelection(props: { pattern: Pattern; clipboard: Pattern; atMs: number }) {
  const { pattern, clipboard, atMs } = props;
  const next = structuredClone(pattern);
  const selection: PointSelection[] = [];
  const offset = clamp(
    Number.isFinite(atMs) ? Math.round(atMs) : 0,
    0,
    MAX_PATTERN_MS - patternEnd(clipboard),
  );
  for (const layer of LAYERS) {
    if (layer === "discrete") {
      for (const point of clipboard.discretePattern) {
        selection.push({ layer, index: next.discretePattern.length });
        next.discretePattern.push({ ...point, time: point.time + offset });
      }
    } else {
      for (const point of clipboard.continuousPattern[layer]) {
        selection.push({ layer, index: next.continuousPattern[layer].length });
        next.continuousPattern[layer].push({ ...point, time: point.time + offset });
      }
    }
  }
  if (!isPattern(next)) throw new Error("This edit exceeds the pattern point limit.");
  return { pattern: next, selection };
}

export function duplicateSelection(props: IEditSelection & { offsetMs?: number }) {
  const points = selectedPoints(props);
  const start = points.length ? Math.min(...points.map((point) => point.time)) : 0;
  return pasteSelection({
    pattern: props.pattern,
    clipboard: copySelection(props),
    atMs: start + (props.offsetMs ?? 10),
  });
}

export function selectInBounds(props: {
  pattern: Pattern;
  bounds: ISelectionBounds;
  layers: readonly PointSelection["layer"][];
}): PointSelection[] {
  const { pattern, bounds, layers } = props;
  const selection: PointSelection[] = [];
  for (const layer of layers) {
    const points =
      layer === "discrete" ? pattern.discretePattern : pattern.continuousPattern[layer];
    points.forEach((point, index) => {
      const value = "value" in point ? point.value : point.amplitude;
      if (
        point.time >= bounds.startMs &&
        point.time <= bounds.endMs &&
        value >= bounds.minValue &&
        value <= bounds.maxValue
      )
        selection.push({ layer, index });
    });
  }
  return selection;
}
