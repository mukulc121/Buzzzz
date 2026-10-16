import { CHART_PADDING as PAD, type IChartGeometry } from "./geometry";
import type { IAnalysisCurve, IPlaybackRange, ITimelineMarker } from "./model";
import type { useChartInteraction } from "./useChartInteraction";

interface IChartOverlays {
  geometry: IChartGeometry;
  range?: IPlaybackRange;
  markers?: readonly ITimelineMarker[];
  curves?: readonly IAnalysisCurve[];
  rectangle?: ReturnType<typeof useChartInteraction>["rectangle"];
}

export function ChartOverlays(props: IChartOverlays) {
  const { geometry, range, markers = [], curves = [], rectangle } = props;
  const { x, y, height, inView } = geometry;
  return (
    <g pointerEvents="none">
      {range && (
        <rect
          x={x(Math.min(range.start, range.end))}
          y={PAD}
          width={Math.abs(x(range.end) - x(range.start))}
          height={height - 2 * PAD}
          fill="var(--accent)"
          fillOpacity={0.08}
          aria-hidden
        />
      )}
      {curves
        .filter((curve) => curve.points.length)
        .map((curve) => (
          <path
            key={curve.id}
            role="img"
            aria-label={curve.label}
            d={curve.points
              .map((point, index) => `${index ? "L" : "M"}${x(point.time)},${y(point.value)}`)
              .join(" ")}
            fill="none"
            stroke={curve.color}
            strokeWidth={1.5}
          />
        ))}
      {markers
        .filter((marker) => inView(marker.time))
        .map((marker) => (
          <g
            key={marker.id}
            role="img"
            aria-label={`Marker ${marker.label} at ${Math.round(marker.time)} milliseconds`}
          >
            <line
              x1={x(marker.time)}
              x2={x(marker.time)}
              y1={PAD}
              y2={height - PAD}
              stroke="var(--muted)"
              strokeDasharray="3 4"
            />
            <text x={x(marker.time) + 4} y={PAD + 12} className="tick">
              {marker.label}
            </text>
          </g>
        ))}
      {rectangle && (
        <rect
          x={Math.min(rectangle.from.x, rectangle.to.x)}
          y={Math.min(rectangle.from.y, rectangle.to.y)}
          width={Math.abs(rectangle.to.x - rectangle.from.x)}
          height={Math.abs(rectangle.to.y - rectangle.from.y)}
          fill="var(--accent)"
          fillOpacity={0.1}
          stroke="var(--accent)"
          strokeDasharray="4 3"
          aria-hidden
        />
      )}
    </g>
  );
}
