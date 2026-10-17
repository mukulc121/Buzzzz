import { useTimelineScale } from "./useTimelineScale";
import { useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { patternEnd, type Pattern } from "@buzzzz/core";
import type { IPlaybackRange, ITimelineMarker, IViewport } from "./model";
import type { IAudioAnalysis } from "../audio/model";
import type { IAnimationDocument } from "../animation/model";
import type { IAnimationAnalysis } from "../animation/model";
import {
  MIN_RANGE_MS,
  dragRange,
  dragViewport,
  keyDelta,
  timelineEnd,
  type SpanPart,
} from "./timelineGeometry";
import { useTimelineDrag } from "./useTimelineDrag";
import { TimelineClipControls } from "./TimelineClipControls";
import { TimelineLanes } from "./TimelineLanes";
import { TimelineHeader } from "./TimelineHeader";
import { TimelineRuler } from "./TimelineRuler";
import { TimelineScrollbar } from "./TimelineScrollbar";
import { ResizeHandle } from "../../components/ResizeHandle";
import type { IRiveCueTimeline } from "../rive/riveCueTimeline";

interface ITimelinePanel {
  instanceKey?: string;
  pattern: Pattern;
  viewport: IViewport;
  onViewChange: (value: IViewport) => void;
  range: IPlaybackRange | null;
  onRangeChange: (value: IPlaybackRange | null) => void;
  playhead: number | null;
  onScrub: (time: number) => void;
  markers: readonly ITimelineMarker[];
  audio: IAudioAnalysis | null;
  durationMs: number;
  animation?: IAnimationAnalysis | null;
  animationDocument?: IAnimationDocument | null;
  onBegin?: () => void;
  onMarkerMove?: (id: string, time: number) => void;
  riveCues?: IRiveCueTimeline | null;
  getPlayhead?: () => number | null;
}

export function TimelinePanel(props: ITimelinePanel) {
  const { pattern, viewport, onViewChange, range, onRangeChange, playhead, onScrub } = props;
  const { markers, audio, durationMs, animation = null, onBegin } = props;
  const [collapsed, setCollapsed] = useState(false);
  const [height, setHeight] = useState(120);
  const resizeOrigin = useRef(120);
  const track = useRef<HTMLDivElement>(null);
  const patternMs = patternEnd(pattern);
  const mediaMs = Math.max(durationMs, animation?.durationMs ?? 0, props.riveCues?.durationMs ?? 0);
  const liveEnd = timelineEnd({ patternMs, mediaMs, viewport, range });
  const scale = useTimelineScale(track, liveEnd, collapsed, props.instanceKey);
  const playbackRange = range ?? { start: 0, end: Math.max(MIN_RANGE_MS, patternMs, mediaMs) };
  const drag = useTimelineDrag({
    track,
    end: liveEnd,
    axis: scale.view,
    viewport,
    range,
    defaultRange: playbackRange,
    playhead,
    onViewChange,
    onRangeChange,
    onScrub,
    onBegin,
  });
  const { end } = drag;
  const lanes = [
    ...(audio ? ["Audio"] : []),
    ...(animation || props.animationDocument ? ["Animation"] : []),
    "Haptics",
  ];
  const minimumHeight = lanes.length === 1 ? 120 : 200 + (lanes.length - 2) * 80;
  const visibleHeight = Math.max(minimumHeight, height);
  const style: CSSProperties & { "--lane-height": string } = {
    height: visibleHeight,
    "--lane-height": `${(visibleHeight - 86 - (lanes.length - 1) * 34) / lanes.length}px`,
  };
  const commitRange = (value: IPlaybackRange | null) => {
    onBegin?.();
    onRangeChange(value);
  };
  const stepRange = (part: SpanPart, deltaMs: number) =>
    commitRange(dragRange({ range: playbackRange, part, deltaMs, end }));
  const scrubKey = (event: KeyboardEvent<HTMLElement>) => {
    const delta = keyDelta(event.key, event.shiftKey);
    if (delta === null) return;
    event.preventDefault();
    onScrub(Math.round(Math.max(0, Math.min(end, (playhead ?? 0) + delta))));
  };
  return (
    <>
      {!collapsed && (
        <ResizeHandle
          label="Resize timelines"
          orientation="horizontal"
          onStart={() => {
            resizeOrigin.current = visibleHeight;
          }}
          onResize={(delta) =>
            setHeight(Math.max(minimumHeight, Math.min(560, resizeOrigin.current - delta)))
          }
        />
      )}
      <section
        className="timeline-panel"
        aria-label="Timeline"
        data-tracks={lanes.length}
        style={collapsed ? undefined : style}
      >
        <TimelineHeader
          collapsed={collapsed}
          onCollapsedChange={setCollapsed}
          onZoom={scale.zoom}
        />
        {!collapsed && (
          <div className="timeline-track" ref={track} data-dragging={drag.dragging || undefined}>
            <div className="timeline-clips">
              <div
                className="timeline-lanes"
                role={props.riveCues ? "group" : "slider"}
                tabIndex={props.riveCues ? undefined : 0}
                aria-label="Playback position"
                aria-valuemin={props.riveCues ? undefined : 0}
                aria-valuemax={props.riveCues ? undefined : Math.round(end)}
                aria-valuenow={props.riveCues ? undefined : Math.round(playhead ?? 0)}
                aria-valuetext={
                  props.riveCues ? undefined : `${Math.round(playhead ?? 0)} milliseconds`
                }
                onKeyDown={props.riveCues ? undefined : scrubKey}
                {...(props.riveCues ? {} : drag.bind({ kind: "scrub" }))}
              >
                <TimelineLanes
                  end={scale.view.durationMs}
                  start={scale.view.startMs}
                  pattern={pattern}
                  audio={audio}
                  animation={animation}
                  animationDocument={props.animationDocument}
                  riveCues={props.riveCues}
                  getPlayhead={props.getPlayhead}
                />
              </div>
              <div className="timeline-overlays">
                {lanes.map((label, index) => (
                  <div
                    className="timeline-overlay-row"
                    key={label}
                    style={{ top: `calc(${index} * (var(--lane-height) + 34px))` }}
                  >
                    <TimelineClipControls
                      label={label}
                      viewport={viewport}
                      axis={scale.view}
                      range={playbackRange}
                      total={end}
                      playhead={playhead}
                      markers={markers}
                      markerDurationMs={Math.max(patternMs, mediaMs)}
                      onMarkerMove={props.onMarkerMove}
                      onBegin={onBegin}
                      bind={drag.bind}
                      onViewStep={(part, deltaMs) =>
                        onViewChange(dragViewport({ viewport, part, deltaMs, end }))
                      }
                      onRangeStep={stepRange}
                      onSeek={onScrub}
                      readonlyPlayback={Boolean(props.riveCues)}
                    />
                  </div>
                ))}
              </div>
              <TimelineScrollbar view={scale.view} extent={end} onStartChange={scale.pan} />
            </div>
            <TimelineRuler
              start={scale.view.startMs}
              end={scale.view.startMs + scale.view.durationMs}
            />
          </div>
        )}
      </section>
    </>
  );
}
