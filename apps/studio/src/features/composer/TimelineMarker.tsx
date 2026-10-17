import { useRef } from "react";
import type { ITimelineMarker, IViewport } from "./model";
import { useMarkerDrag } from "./useMarkerDrag";

interface ITimelineMarkerControl {
  marker: ITimelineMarker;
  prefix: string;
  position: number;
  axis: IViewport;
  durationMs: number;
  onBegin?: () => void;
  onMove?: (id: string, time: number) => void;
}

export function TimelineMarker(props: ITimelineMarkerControl) {
  const { marker, prefix, axis } = props;
  const element = useRef<HTMLDivElement>(null);
  const drag = useMarkerDrag({
    marker,
    minTime: axis.startMs,
    maxTime: Math.min(props.durationMs, axis.startMs + axis.durationMs),
    timeAtClientX: (clientX) => {
      const bounds = element.current?.parentElement?.getBoundingClientRect();
      return bounds
        ? axis.startMs + ((clientX - bounds.left) / bounds.width) * axis.durationMs
        : marker.time;
    },
    onMove: props.onMove,
    onBegin: props.onBegin,
  });
  return (
    <div
      ref={element}
      className="timeline-marker"
      style={{ left: `${props.position}%` }}
      role="slider"
      tabIndex={props.onMove ? 0 : undefined}
      aria-label={`${prefix}Marker ${marker.label || `${Math.round(marker.time)} ms`}`}
      aria-valuemin={0}
      aria-valuemax={props.durationMs}
      aria-valuenow={Math.round(marker.time)}
      aria-valuetext={`${Math.round(marker.time)} milliseconds`}
      title={marker.label}
      {...drag}
    >
      <span>{marker.label}</span>
    </div>
  );
}
