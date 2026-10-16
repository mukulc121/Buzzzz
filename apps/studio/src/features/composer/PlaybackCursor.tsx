import { MAX_PATTERN_MS } from "@buzzzz/core";
import type { IChartGeometry } from "./geometry";
import { snapTime } from "./viewport";
import { chartReadout } from "./chartReadout";

interface IPlaybackCursor {
  time: number | null;
  geometry: IChartGeometry;
  snapMs: number;
  onScrub?: (time: number) => void;
}

export function PlaybackCursor(props: IPlaybackCursor) {
  const { geometry, snapMs, onScrub } = props;
  const time = props.time ?? 0;
  if (!geometry.inView(time)) return null;
  const label = `${Math.round(time)} ms`;
  const readout = chartReadout(label, geometry.x(time), geometry.width);
  const labelTop = Math.max(0, geometry.top - 16);
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
        y={geometry.top}
        width={16}
        height={geometry.plotHeight}
        fill="rgba(0, 0, 0, 0)"
      />
      <line
        x1={geometry.x(time)}
        x2={geometry.x(time)}
        y1={geometry.top}
        y2={geometry.bottom}
        className="playhead"
      />
      <rect
        x={readout.left}
        y={labelTop}
        width={readout.width}
        height={14}
        rx={3}
        fill="var(--cursor)"
      />
      <text
        x={readout.left + readout.width / 2}
        y={labelTop + 11}
        textAnchor="middle"
        fill="var(--cursor-text)"
        fontSize={10}
        pointerEvents="none"
      >
        {label}
      </text>
    </g>
  );
}
