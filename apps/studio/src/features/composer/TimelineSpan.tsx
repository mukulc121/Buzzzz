import type { IViewport } from "./model";
import type { KeyboardEvent } from "react";
import type { TimelinePointerHandlers } from "./useTimelineDrag";
import { fractionOf, keyDelta, type SpanPart } from "./timelineGeometry";

interface ITimelineSpan {
  kind: "view" | "range";
  label: string;
  start: number;
  end: number;
  total: number;
  view: IViewport;
  minLength: number;
  bind: (part: SpanPart) => TimelinePointerHandlers;
  onStep: (part: SpanPart, deltaMs: number) => void;
}

const PARTS: { part: SpanPart; name: string }[] = [
  { part: "pan", name: "position" },
  { part: "start", name: "start" },
  { part: "end", name: "end" },
];
const RANGE_PARTS: typeof PARTS = [
  { part: "end", name: "end" },
  { part: "start", name: "start" },
];

export function TimelineSpan(props: ITimelineSpan) {
  const { kind, label, start, end, total, view, minLength, bind, onStep } = props;
  const left = fractionOf(start - view.startMs, view.durationMs) * 100;
  const width = fractionOf(end - view.startMs, view.durationMs) * 100 - left;
  const limits: Record<SpanPart, { now: number; min: number; max: number }> = {
    pan: { now: start, min: 0, max: Math.max(0, total - (end - start)) },
    start: { now: start, min: 0, max: end - minLength },
    end: { now: end, min: start + minLength, max: total },
  };
  const keyDown = (part: SpanPart) => (event: KeyboardEvent<HTMLElement>) => {
    const delta = keyDelta(event.key, event.shiftKey);
    if (delta === null) return;
    event.preventDefault();
    event.stopPropagation();
    onStep(part, delta);
  };
  return (
    <div
      className={`timeline-span timeline-span-${kind}`}
      style={{ left: `${left}%`, width: `${width}%` }}
    >
      {(kind === "range" ? RANGE_PARTS : PARTS).map(({ part, name }) => (
        <div
          key={part}
          hidden={
            part !== "pan" &&
            (limits[part].now < view.startMs || limits[part].now > view.startMs + view.durationMs)
          }
          className={`timeline-span-${part}`}
          role="slider"
          tabIndex={0}
          aria-label={`${label} ${name}`}
          aria-orientation="horizontal"
          aria-valuemin={Math.round(limits[part].min)}
          aria-valuemax={Math.round(limits[part].max)}
          aria-valuenow={Math.round(limits[part].now)}
          aria-valuetext={`${Math.round(limits[part].now)} milliseconds`}
          onKeyDown={keyDown(part)}
          {...bind(part)}
        />
      ))}
    </div>
  );
}
