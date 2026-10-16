import type { Pattern } from "@buzzzz/core";
import { moveSelection } from "./editing";
import { quantizeValue } from "./editorSettings";
import type { PointSelection } from "./model";

export type PointDragMode = "both" | "time" | "amplitude" | "frequency";

interface IPointDrag {
  pattern: Pattern;
  selection: readonly PointSelection[];
  point: PointSelection;
  mode: PointDragMode;
  timeMs: number;
  value: number;
  valueDecimals: number;
}

export function dragPoint(props: IPointDrag): Pattern {
  const { pattern, point, mode, value, valueDecimals } = props;
  if (mode === "both" || mode === "time")
    return moveSelection({ ...props, value: mode === "time" ? 0 : value });
  const tap = pattern.discretePattern[point.index];
  if (point.layer !== "discrete" || !tap) return pattern;
  return {
    ...pattern,
    discretePattern: pattern.discretePattern.map((item, index) =>
      index === point.index
        ? { ...item, [mode]: quantizeValue(tap[mode] + value, valueDecimals) }
        : item,
    ),
  };
}
