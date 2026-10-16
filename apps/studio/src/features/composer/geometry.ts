export const CHART_PADDING = 28;

export interface IChartGeometry {
  width: number;
  height: number;
  startMs: number;
  durationMs: number;
  x: (time: number) => number;
  y: (value: number) => number;
  inView: (time: number) => boolean;
}
