import type { IChartGeometry } from "./geometry";
import type { IAnalysisCurve, IMarkerActions, IPlaybackRange, ITimelineMarker } from "./model";
import type { useChartInteraction } from "./useChartInteraction";
import { ChartMarker } from "./ChartMarker";

interface IChartOverlays extends IMarkerActions {
  geometry: IChartGeometry;
  range?: IPlaybackRange;
  markers?: readonly ITimelineMarker[];
  curves?: readonly IAnalysisCurve[];
  rectangle?: ReturnType<typeof useChartInteraction>["rectangle"];
  markerDurationMs?: number;
  onBegin?: () => void;
}

export function ChartOverlays(props: IChartOverlays) {
  const { geometry, range, markers = [], curves = [], rectangle } = props;
  const { x, y, top, plotHeight, inView } = geometry;
  return (
    <g pointerEvents="none">
      {range && (
        <rect
          x={x(Math.min(range.start, range.end))}
          y={top}
          width={Math.abs(x(range.end) - x(range.start))}
          height={plotHeight}
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
          <ChartMarker
            key={marker.id}
            marker={marker}
            geometry={geometry}
            durationMs={props.markerDurationMs ?? geometry.startMs + geometry.durationMs}
            onMarkerMove={props.onMarkerMove}
            onMarkerRename={props.onMarkerRename}
            onBegin={props.onBegin}
          />
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
