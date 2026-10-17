import type { GridDensity } from "./editorSettings";

interface IGridAxis {
  major: number[];
  minor: number[];
  labels: number[];
}
const DENSITIES = {
  sparse: { timePx: 160, valuePx: 140, subdivisions: 0 },
  normal: { timePx: 100, valuePx: 90, subdivisions: 2 },
  dense: { timePx: 60, valuePx: 55, subdivisions: 4 },
};
function nearest(target: number, options: number[]): number {
  return options.reduce((best, value) =>
    Math.abs(Math.log(value / target)) < Math.abs(Math.log(best / target)) ? value : best,
  );
}
function ticks(start: number, end: number, step: number): number[] {
  const first = Math.ceil(start / step - 1e-9);
  const count = Math.max(0, Math.floor(end / step + 1e-9) - first + 1);
  return Array.from({ length: Math.min(1000, count) }, (_, index) =>
    Number(((first + index) * step).toFixed(6)),
  );
}
function axis(
  start: number,
  end: number,
  step: number,
  pixelsPerUnit: number,
  subdivisions: number,
  labelSpacing: number,
): IGridAxis {
  const major = ticks(start, end, step);
  const minorStep = step / subdivisions;
  const minor =
    subdivisions > 1 && minorStep * pixelsPerUnit >= 6
      ? ticks(start, end, minorStep).filter(
          (value) => Math.abs(value / step - Math.round(value / step)) > 1e-6,
        )
      : [];
  const stride = Math.max(1, Math.ceil(labelSpacing / (step * pixelsPerUnit)));
  return { major, minor, labels: major.filter((value) => Math.round(value / step) % stride === 0) };
}
interface IChartGrid {
  density: GridDensity;
  width: number;
  height: number;
  startMs: number;
  durationMs: number;
}
export function chartGrid(props: IChartGrid): { time: IGridAxis; value: IGridAxis } {
  const { density, width, height, startMs, durationMs } = props;
  if (density === "off" || width <= 0 || height <= 0 || durationMs <= 0)
    return {
      time: { major: [], minor: [], labels: [] },
      value: { major: [], minor: [], labels: [] },
    };
  const layout = DENSITIES[density];
  const targetTime = (layout.timePx / width) * durationMs;
  const magnitude = 10 ** Math.floor(Math.log10(targetTime));
  const timeStep = Math.max(
    1,
    nearest(
      targetTime,
      [1, 2, 5, 10].map((value) => value * magnitude),
    ),
  );
  const valueStep = nearest(layout.valuePx / height, [0.05, 0.1, 0.2, 0.25, 0.5, 1]);
  return {
    time: axis(
      Math.max(0, startMs),
      startMs + durationMs,
      timeStep,
      width / durationMs,
      layout.subdivisions,
      48,
    ),
    value: axis(0, 1, valueStep, height, layout.subdivisions, 22),
  };
}
