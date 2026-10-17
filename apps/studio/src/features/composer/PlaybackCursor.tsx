import { MAX_PATTERN_MS } from "@buzzzz/core";
import { useEffect, useEffectEvent, useRef } from "react";
import type { IChartGeometry } from "./geometry";
import { snapTime } from "./viewport";
import { chartReadout } from "./chartReadout";

interface IPlaybackCursor {
  time: number | null;
  geometry: Pick<IChartGeometry, "x" | "inView" | "top" | "bottom" | "width" | "plotHeight">;
  snapMs: number;
  onScrub?: (time: number) => void;
  getTime?: () => number | null;
  label?: boolean;
}

export function PlaybackCursor(props: IPlaybackCursor) {
  const { geometry, snapMs, onScrub } = props;
  const group = useRef<SVGGElement>(null);
  const line = useRef<SVGLineElement>(null);
  const hit = useRef<SVGRectElement>(null);
  const box = useRef<SVGRectElement>(null);
  const text = useRef<SVGTextElement>(null);
  const update = useEffectEvent(() => {
    const time = props.getTime?.();
    const visible = time !== undefined && time !== null && geometry.inView(time);
    group.current?.setAttribute("visibility", visible ? "visible" : "hidden");
    if (!visible || time === null || time === undefined) return;
    const x = geometry.x(time);
    const value = Math.round(time);
    const label = `${value} ms`;
    const readout = chartReadout(label, x, geometry.width);
    line.current?.setAttribute("x1", String(x));
    line.current?.setAttribute("x2", String(x));
    hit.current?.setAttribute("x", String(x - 8));
    box.current?.setAttribute("x", String(readout.left));
    box.current?.setAttribute("width", String(readout.width));
    text.current?.setAttribute("x", String(readout.left + readout.width / 2));
    if (text.current) text.current.textContent = label;
    group.current?.setAttribute("aria-valuenow", String(value));
    group.current?.setAttribute("aria-valuetext", `${value} milliseconds`);
  });
  const live = Boolean(props.getTime);
  useEffect(() => {
    if (!live) return;
    let frame: number;
    const tick = () => {
      update();
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, [live]);
  const time = props.time ?? 0;
  if (!live && !geometry.inView(time)) return null;
  const label = `${Math.round(time)} ms`;
  const readout = chartReadout(label, geometry.x(time), geometry.width);
  const labelTop = Math.max(0, geometry.top - 16);
  return (
    <g
      ref={group}
      data-playhead
      data-live={live || undefined}
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
        ref={hit}
        x={geometry.x(time) - 8}
        y={geometry.top}
        width={16}
        height={geometry.plotHeight}
        fill="rgba(0, 0, 0, 0)"
      />
      <line
        ref={line}
        x1={geometry.x(time)}
        x2={geometry.x(time)}
        y1={geometry.top}
        y2={geometry.bottom}
        className="playhead"
        stroke="var(--cursor)"
        strokeWidth={1.5}
        opacity={0.9}
        vectorEffect={props.label === false ? "non-scaling-stroke" : undefined}
      />
      {props.label !== false && (
        <rect
          ref={box}
          x={readout.left}
          y={labelTop}
          width={readout.width}
          height={14}
          rx={3}
          fill="var(--cursor)"
        />
      )}
      {props.label !== false && (
        <text
          ref={text}
          x={readout.left + readout.width / 2}
          y={labelTop + 11}
          textAnchor="middle"
          fill="var(--cursor-text)"
          fontSize={10}
          pointerEvents="none"
        >
          {label}
        </text>
      )}
    </g>
  );
}
