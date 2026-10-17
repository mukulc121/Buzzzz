import { useRef, useState } from "react";
import type { IChartGeometry } from "./geometry";
import type { IMarkerActions, ITimelineMarker } from "./model";
import { useMarkerDrag } from "./useMarkerDrag";
import { MarkerRename } from "./MarkerRename";

interface IChartMarker extends IMarkerActions {
  marker: ITimelineMarker;
  geometry: IChartGeometry;
  durationMs: number;
  onBegin?: () => void;
}

export function ChartMarker(props: IChartMarker) {
  const { marker, geometry } = props;
  const group = useRef<SVGGElement>(null);
  const [renaming, setRenaming] = useState(false);
  const label = marker.label || `${Math.round(marker.time)} ms`;
  const width = Math.min(150, label.length * 6.2 + 12);
  const x = geometry.x(marker.time);
  const left = x + 2 + width <= geometry.right ? x + 2 : x - 2 - width;
  const drag = useMarkerDrag({
    marker,
    minTime: Math.max(0, geometry.timeAtX(geometry.left)),
    maxTime: Math.min(props.durationMs, geometry.timeAtX(geometry.right)),
    timeAtClientX: (clientX) => {
      const bounds = group.current?.ownerSVGElement?.getBoundingClientRect();
      return bounds ? geometry.timeAtX(clientX - bounds.left) : marker.time;
    },
    onMove: props.onMarkerMove,
    onBegin: props.onBegin,
  });
  const renameLeft = x + 152 <= geometry.right ? x + 2 : x - 152;
  return (
    <g
      ref={group}
      className="chart-marker"
      role="slider"
      tabIndex={props.onMarkerMove ? 0 : undefined}
      aria-label={`Marker ${marker.label || `${Math.round(marker.time)} ms`}`}
      aria-valuemin={0}
      aria-valuemax={props.durationMs}
      aria-valuenow={Math.round(marker.time)}
      aria-valuetext={`${Math.round(marker.time)} milliseconds`}
      pointerEvents="auto"
      {...drag}
      onDoubleClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (props.onMarkerRename) setRenaming(true);
      }}
    >
      <line
        x1={x}
        x2={x}
        y1={geometry.top}
        y2={geometry.bottom}
        stroke="var(--marker)"
        strokeWidth={1.5}
        strokeDasharray="4 4"
        opacity={0.85}
        pointerEvents="none"
      />
      {renaming ? (
        <foreignObject x={renameLeft} y={geometry.top} width={150} height={16} overflow="visible">
          <MarkerRename
            label={marker.label}
            onCommit={(value) => {
              if (value === marker.label) return;
              props.onBegin?.();
              props.onMarkerRename?.(marker.id, value);
            }}
            onClose={() => setRenaming(false)}
          />
        </foreignObject>
      ) : (
        <>
          <rect x={left} y={geometry.top} width={width} height={16} rx={3} fill="var(--marker)" />
          <foreignObject x={left} y={geometry.top} width={width} height={16} pointerEvents="none">
            <div className="chart-marker-label">{label}</div>
          </foreignObject>
        </>
      )}
    </g>
  );
}
