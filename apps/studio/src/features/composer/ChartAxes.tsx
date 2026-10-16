import { CHART_PADDING as PAD, type IChartGeometry } from "./geometry";

interface IChartAxes {
  geometry: IChartGeometry;
}
const niceStep = (span: number) =>
  [10, 25, 50, 100, 250, 500, 1000, 2000, 5000].find((step) => span / step <= 12) ?? 10000;

export function ChartAxes(props: IChartAxes) {
  const { geometry } = props;
  const { width, height, startMs, durationMs, x, y } = geometry;
  const step = niceStep(durationMs);
  const firstTick = Math.ceil(startMs / step) * step;
  const ticks = Array.from(
    { length: Math.max(0, Math.floor((startMs + durationMs - firstTick) / step) + 1) },
    (_, index) => firstTick + index * step,
  );
  return (
    <g aria-hidden>
      {ticks.map((time) => (
        <g key={time}>
          <line x1={x(time)} x2={x(time)} y1={PAD} y2={height - PAD} className="grid" />
          <text x={x(time)} y={height - 8} className="tick">
            {Math.round(time)}
          </text>
        </g>
      ))}
      {[0, 0.25, 0.5, 0.75, 1].map((value) => (
        <g key={value}>
          <line x1={PAD} x2={width - PAD} y1={y(value)} y2={y(value)} className="grid" />
          <text x={4} y={y(value) + 4} className="tick">
            {value * 100}
          </text>
        </g>
      ))}
    </g>
  );
}
