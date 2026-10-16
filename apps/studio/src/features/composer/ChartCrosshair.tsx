import type { IChartGeometry } from "./geometry";
import { chartReadout } from "./chartReadout";

interface IChartCrosshair {
  position: { x: number; y: number } | null;
  geometry: IChartGeometry;
  valueDecimals?: number;
}

export function ChartCrosshair(props: IChartCrosshair) {
  const { position, geometry, valueDecimals = 1 } = props;
  if (!position) return null;
  const { x, y } = position;
  const hoverTime = geometry.timeAtX(x);
  const hoverValue = geometry.valueAtY(y);
  const time = `${Math.round(hoverTime)} ms`;
  const value = `${(hoverValue * 100).toFixed(valueDecimals)}%`;
  const timeReadout = chartReadout(time, x, geometry.width);
  const valueWidth = chartReadout(value, 0, geometry.width).width;
  const valueLeft = Math.min(
    Math.max(geometry.left - valueWidth - 6, 0),
    geometry.width - valueWidth,
  );
  const valueTop = Math.max(0, Math.min(y - 7, geometry.height - 14));
  return (
    <g className="chart-crosshair" aria-hidden pointerEvents="none">
      <path
        d={`M${x},${geometry.top}V${geometry.bottom} M${geometry.left},${y}H${geometry.right}`}
        fill="none"
        stroke="var(--freq)"
        strokeWidth={1}
        strokeOpacity={0.5}
        strokeDasharray="3 3"
      />
      <rect x={valueLeft} y={valueTop} width={valueWidth} height={14} rx={3} fill="var(--freq)" />
      <text
        className="chart-hover-value"
        x={valueLeft + valueWidth / 2}
        y={valueTop + 11}
        textAnchor="middle"
        fontSize={10}
        fill="var(--cursor-text)"
      >
        {value}
      </text>
      <rect
        x={timeReadout.left}
        y={geometry.bottom + 6}
        width={timeReadout.width}
        height={14}
        rx={3}
        fill="var(--freq)"
      />
      <text
        className="chart-hover-time"
        x={timeReadout.left + timeReadout.width / 2}
        y={geometry.bottom + 17}
        textAnchor="middle"
        fontSize={10}
        fill="var(--cursor-text)"
      >
        {time}
      </text>
    </g>
  );
}
