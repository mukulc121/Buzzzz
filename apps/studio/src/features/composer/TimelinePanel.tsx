import { useRef, useState, type KeyboardEvent } from "react";
import { MAX_PATTERN_MS, patternEnd, type Pattern } from "@buzzzz/core";
import type { IPlaybackRange, ITimelineMarker, IViewport } from "./model";
import type { IAudioAnalysis } from "../audio/model";
import type { IAnimationAnalysis } from "../animation/model";
import {
  MIN_RANGE_MS,
  MIN_VIEW_MS,
  dragRange,
  dragViewport,
  fractionOf,
  keyDelta,
  spanStyle,
  timelineEnd,
  type SpanPart,
} from "./timelineGeometry";
import { useTimelineDrag } from "./useTimelineDrag";
import { TimelineSpan } from "./TimelineSpan";
import { TimelineLanes, type TimelineLaneId } from "./TimelineLanes";
import { TimelineHeader } from "./TimelineHeader";
import { TimelineRuler } from "./TimelineRuler";

interface ITimelinePanel {
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
  onZoom: (factor: number) => void;
  onFit: () => void;
  animation?: IAnimationAnalysis | null;
  onBegin?: () => void;
}

const LANES: { id: TimelineLaneId; label: string }[] = [
  { id: "pattern", label: "Pattern" },
  { id: "audio", label: "Audio" },
  { id: "motion", label: "Motion" },
];

export function TimelinePanel(props: ITimelinePanel) {
  const { pattern, viewport, onViewChange, range, onRangeChange, playhead, onScrub } = props;
  const { markers, audio, durationMs, onZoom, onFit, animation = null, onBegin } = props;
  const [collapsed, setCollapsed] = useState(false);
  const [lanes, setLanes] = useState<TimelineLaneId[]>(["pattern", "audio", "motion"]);
  const track = useRef<HTMLDivElement>(null);
  const patternMs = patternEnd(pattern);
  const mediaMs = Math.max(durationMs, animation?.durationMs ?? 0);
  const liveEnd = timelineEnd({ patternMs, mediaMs, viewport, range });
  const drag = useTimelineDrag({
    track,
    end: liveEnd,
    viewport,
    range,
    playhead,
    onViewChange,
    onRangeChange,
    onScrub,
    onBegin,
  });
  const { end } = drag;
  const viewEnd = viewport.startMs + viewport.durationMs;
  const available = LANES.filter(
    ({ id }) => id === "pattern" || (id === "audio" ? audio : animation),
  );
  const commitRange = (value: IPlaybackRange | null) => {
    onBegin?.();
    onRangeChange(value);
  };
  const stepRange = (part: SpanPart, deltaMs: number) =>
    range && commitRange(dragRange({ range, part, deltaMs, end }));
  const scrubKey = (event: KeyboardEvent<HTMLElement>) => {
    const delta = keyDelta(event.key, event.shiftKey);
    if (delta === null) return;
    event.preventDefault();
    onScrub(Math.round(Math.max(0, Math.min(end, (playhead ?? 0) + delta))));
  };
  return (
    <section className="timeline-panel" aria-label="Timeline">
      <TimelineHeader
        collapsed={collapsed}
        onCollapsedChange={setCollapsed}
        available={available}
        lanes={lanes}
        onToggleLane={(id) =>
          setLanes((items) =>
            items.includes(id) ? items.filter((item) => item !== id) : [...items, id],
          )
        }
        rangeEnabled={range !== null}
        onRangeEnabledChange={(enabled) =>
          commitRange(
            enabled
              ? {
                  start: 0,
                  end: Math.min(MAX_PATTERN_MS, Math.max(MIN_RANGE_MS, patternMs, mediaMs)),
                }
              : null,
          )
        }
        onZoom={onZoom}
        onFit={onFit}
        end={end}
      />
      {!collapsed && (
        <div className="timeline-track" ref={track} data-dragging={drag.dragging || undefined}>
          <TimelineRuler
            end={end}
            markers={markers}
            onSeek={onScrub}
            scrub={drag.bind({ kind: "scrub" })}
          />
          <div className="timeline-bar">
            <TimelineSpan
              kind="view"
              label="Timeline view"
              start={viewport.startMs}
              end={viewEnd}
              total={end}
              minLength={MIN_VIEW_MS}
              bind={(part) => drag.bind({ kind: "view", part })}
              onStep={(part, deltaMs) =>
                onViewChange(dragViewport({ viewport, part, deltaMs, end }))
              }
            />
          </div>
          {range && (
            <div className="timeline-bar">
              <TimelineSpan
                kind="range"
                label="Playback range"
                start={range.start}
                end={range.end}
                total={end}
                minLength={MIN_RANGE_MS}
                bind={(part) => drag.bind({ kind: "range", part })}
                onStep={stepRange}
              />
            </div>
          )}
          <div
            className="timeline-lanes"
            role="slider"
            tabIndex={0}
            aria-label="Playback position"
            aria-valuemin={0}
            aria-valuemax={Math.round(end)}
            aria-valuenow={Math.round(playhead ?? 0)}
            aria-valuetext={`${Math.round(playhead ?? 0)} milliseconds`}
            onKeyDown={scrubKey}
            {...drag.bind({ kind: "scrub" })}
          >
            <TimelineLanes
              pattern={pattern}
              audio={audio}
              animation={animation}
              end={end}
              lanes={lanes}
            />
            <div className="timeline-window" style={spanStyle(viewport.startMs, viewEnd, end)} />
            {range && (
              <div
                className="timeline-range-shade"
                style={spanStyle(range.start, range.end, end)}
              />
            )}
          </div>
          {playhead !== null && (
            <div
              className="timeline-playhead"
              style={{ left: `${fractionOf(playhead, end) * 100}%` }}
            />
          )}
        </div>
      )}
    </section>
  );
}
