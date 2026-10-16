import { MAX_PATTERN_MS } from "@buzzzz/core";
import { CHART_PADDING as PAD, type IChartGeometry } from "./geometry";
import { snapTime } from "./viewport";

interface IPlaybackCursor {
  time: number | null;
  geometry: IChartGeometry;
  snapMs: number;
  onScrub?: (time: number) => void;
}

export function PlaybackCursor(props: IPlaybackCursor) {
  const { time, geometry, snapMs, onScrub } = props;
  if (time === null || !geometry.inView(time)) return null;
  return (
    <g
      data-playhead
      role="slider"
      aria-label="Playback position"
      aria-valuemin={0}
      aria-valuemax={MAX_PATTERN_MS}
      aria-valuenow={Math.round(time)}
      aria-valuetext={`${Math.round(time)} milliseconds`}
      aria-disabled={!onScrub}
      tabIndex={onScrub ? 0 : undefined}
      onKeyDown={(event) => {
        if (!onScrub || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        event.stopPropagation();
        const next =
          event.key === "Home"
            ? 0
            : event.key === "End"
              ? MAX_PATTERN_MS
              : time +
                (event.key === "ArrowRight" ? 1 : -1) * (snapMs || 10) * (event.shiftKey ? 10 : 1);
        onScrub(snapTime(next, snapMs));
      }}
    >
      <rect
        x={geometry.x(time) - 8}
        y={PAD}
        width={16}
        height={geometry.height - 2 * PAD}
        fill="rgba(0, 0, 0, 0)"
      />
      <line
        x1={geometry.x(time)}
        x2={geometry.x(time)}
        y1={PAD}
        y2={geometry.height - PAD}
        className="playhead"
      />
    </g>
  );
}
