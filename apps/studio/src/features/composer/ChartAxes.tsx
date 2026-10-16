import type { IChartGeometry } from "./geometry";
import { chartGrid } from "./chartGrid";
import type { GridDensity } from "./editorSettings";

interface IChartAxes {
  geometry: IChartGeometry;
  density?: GridDensity;
}
export function ChartAxes(props: IChartAxes) {
  const { geometry, density = "normal" } = props;
  const { left, top, right, bottom, axisWidth, plotHeight, startMs, durationMs, x, y } = geometry;
  const grid = chartGrid({
    density,
    width: axisWidth,
    height: plotHeight,
    startMs,
    durationMs,
  });
  return (
    <g aria-hidden="true" data-grid-density={density}>
      {grid.time.minor.map((time) => (
        <line
          key={`minor-time-${time}`}
          x1={x(time)}
          x2={x(time)}
          y1={top}
          y2={bottom}
          className="grid minor"
        />
      ))}
      {grid.time.major.map((time) => (
        <line
          key={`time-${time}`}
          x1={x(time)}
          x2={x(time)}
          y1={top}
          y2={bottom}
          className="grid"
        />
      ))}
      {grid.time.labels.map((time) => (
        <text
          key={`time-label-${time}`}
          x={x(time)}
          y={bottom + 18}
          className="tick"
          textAnchor="middle"
        >
          {Math.round(time)}
        </text>
      ))}
      {grid.value.minor.map((value) => (
        <line
          key={`minor-value-${value}`}
          x1={left}
          x2={right}
          y1={y(value)}
          y2={y(value)}
          className="grid minor"
        />
      ))}
      {grid.value.major.map((value) => (
        <line
          key={`value-${value}`}
          x1={left}
          x2={right}
          y1={y(value)}
          y2={y(value)}
          className={value === 0 ? "grid baseline" : "grid"}
        />
      ))}
      {grid.value.labels.map((value) => (
        <text
          key={`value-label-${value}`}
          x={left - 6}
          y={y(value) + 4}
          className="tick"
          textAnchor="end"
        >
          {Math.round(value * 100)}%
        </text>
      ))}
    </g>
  );
}
