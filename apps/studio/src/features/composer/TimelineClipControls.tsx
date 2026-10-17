import type { IPlaybackRange, ITimelineMarker, IViewport } from "./model";
import {
  keyDelta,
  fractionOf,
  MIN_RANGE_MS,
  MIN_VIEW_MS,
  type SpanPart,
  type TimelineDrag,
} from "./timelineGeometry";
import { TimelineSpan } from "./TimelineSpan";
import type { TimelinePointerHandlers } from "./useTimelineDrag";
import { TimelineMarker } from "./TimelineMarker";

interface ITimelineClipControls {
  label: string;
  viewport: IViewport;
  axis: IViewport;
  range: IPlaybackRange;
  total: number;
  playhead: number | null;
  markers: readonly ITimelineMarker[];
  bind: (value: TimelineDrag) => TimelinePointerHandlers;
  onViewStep: (part: SpanPart, delta: number) => void;
  onRangeStep: (part: SpanPart, delta: number) => void;
  onSeek: (time: number) => void;
  onMarkerMove?: (id: string, time: number) => void;
  onBegin?: () => void;
  markerDurationMs: number;
  readonlyPlayback?: boolean;
}

export function TimelineClipControls(props: ITimelineClipControls) {
  const {
    label,
    viewport,
    axis,
    range,
    total,
    playhead,
    markers,
    bind,
    onViewStep,
    onRangeStep,
    onSeek,
  } = props;
  const position = (time: number) => fractionOf(time - axis.startMs, axis.durationMs) * 100;
  const visible = (time: number) => time >= axis.startMs && time <= axis.startMs + axis.durationMs;
  const prefix = label === "Haptics" ? "" : `${label} `;
  return (
    <>
      {!props.readonlyPlayback && (
        <>
          <div
            className="timeline-excluded"
            style={{ left: 0, width: `${position(range.start)}%` }}
          />
          <div
            className="timeline-excluded"
            style={{ right: 0, width: `${100 - position(range.end)}%` }}
          />
        </>
      )}
      <TimelineSpan
        kind="view"
        label={`${prefix}Timeline view`}
        start={viewport.startMs}
        end={viewport.startMs + viewport.durationMs}
        total={total}
        view={axis}
        minLength={MIN_VIEW_MS}
        bind={(part) => bind({ kind: "view", part })}
        onStep={onViewStep}
      />
      {!props.readonlyPlayback && (
        <TimelineSpan
          kind="range"
          label={`${prefix}Playback range`}
          start={range.start}
          end={range.end}
          total={total}
          view={axis}
          minLength={MIN_RANGE_MS}
          bind={(part) => bind({ kind: "range", part })}
          onStep={onRangeStep}
        />
      )}
      {markers
        .filter((marker) => visible(marker.time))
        .map((marker) => (
          <TimelineMarker
            key={marker.id}
            marker={marker}
            prefix={prefix}
            position={position(marker.time)}
            axis={axis}
            durationMs={props.markerDurationMs}
            onMove={props.onMarkerMove}
            onBegin={props.onBegin}
          />
        ))}
      {!props.readonlyPlayback && visible(playhead ?? 0) && (
        <div
          className="timeline-playhead"
          style={{ left: `${position(playhead ?? 0)}%` }}
          role="slider"
          tabIndex={0}
          aria-label={`${prefix}Scrub position`}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={Math.round(playhead ?? 0)}
          aria-valuetext={`${Math.round(playhead ?? 0)} milliseconds`}
          onKeyDown={(event) => {
            const delta = keyDelta(event.key, event.shiftKey);
            if (delta === null) return;
            event.preventDefault();
            event.stopPropagation();
            onSeek(Math.max(0, Math.min(total, (playhead ?? 0) + delta)));
          }}
          {...bind({ kind: "scrub" })}
        >
          <i />
        </div>
      )}
    </>
  );
}
