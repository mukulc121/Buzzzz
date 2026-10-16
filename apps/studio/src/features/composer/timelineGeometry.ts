import { MAX_PATTERN_MS } from "@buzzzz/core";
import type { IPlaybackRange, IViewport } from "./model";

export const MIN_VIEW_MS = 20;
export const MIN_RANGE_MS = 10;

export type SpanPart = "pan" | "start" | "end";
export type TimelineDrag =
  | { kind: "scrub" }
  | { kind: "view"; part: SpanPart }
  | { kind: "range"; part: SpanPart };

interface ISpan {
  start: number;
  end: number;
}

interface ITimelineBounds {
  patternMs: number;
  mediaMs: number;
  viewport: IViewport;
  range: IPlaybackRange | null;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function timelineEnd(bounds: ITimelineBounds): number {
  const { patternMs, mediaMs, viewport, range } = bounds;
  return clamp(
    Math.max(patternMs, mediaMs, range?.end ?? 0, viewport.startMs + viewport.durationMs),
    MIN_VIEW_MS,
    MAX_PATTERN_MS,
  );
}

export const fractionOf = (time: number, end: number) => (end > 0 ? clamp(time / end, 0, 1) : 0);

export function timeAtPointer(input: {
  clientX: number;
  left: number;
  width: number;
  end: number;
}) {
  const { clientX, left, width, end } = input;
  return width > 0 ? Math.round(clamp(((clientX - left) / width) * end, 0, end)) : 0;
}

function dragSpan(input: {
  span: ISpan;
  part: SpanPart;
  deltaMs: number;
  end: number;
  min: number;
}): ISpan {
  const { span, part, deltaMs, end, min } = input;
  const length = span.end - span.start;
  if (part === "pan") {
    const start = clamp(span.start + deltaMs, 0, Math.max(0, end - length));
    return { start, end: start + length };
  }
  if (part === "start")
    return { start: clamp(span.start + deltaMs, 0, span.end - min), end: span.end };
  return {
    start: span.start,
    end: clamp(span.end + deltaMs, span.start + min, Math.max(end, span.start + min)),
  };
}

export function dragViewport(input: {
  viewport: IViewport;
  part: SpanPart;
  deltaMs: number;
  end: number;
}): IViewport {
  const { viewport, part, deltaMs, end } = input;
  const span = { start: viewport.startMs, end: viewport.startMs + viewport.durationMs };
  const next = dragSpan({ span, part, deltaMs, end, min: MIN_VIEW_MS });
  return { startMs: Math.round(next.start), durationMs: Math.round(next.end - next.start) };
}

export function dragRange(input: {
  range: IPlaybackRange;
  part: SpanPart;
  deltaMs: number;
  end: number;
}): IPlaybackRange {
  const next = dragSpan({ ...input, span: input.range, min: MIN_RANGE_MS });
  return { start: Math.round(next.start), end: Math.round(next.end) };
}

export function keyDelta(key: string, shift: boolean): number | null {
  const step = shift ? 100 : 10;
  if (key === "ArrowLeft" || key === "ArrowDown") return -step;
  if (key === "ArrowRight" || key === "ArrowUp") return step;
  if (key === "PageDown") return -1000;
  if (key === "PageUp") return 1000;
  if (key === "Home") return -Infinity;
  if (key === "End") return Infinity;
  return null;
}

export function curvePoints(
  points: readonly { time: number; value: number }[],
  end: number,
  height: number,
  start = 0,
) {
  return points
    .map(
      (point) =>
        `${((point.time - start) / end) * 1000},${height - clamp(point.value, 0, 1) * height}`,
    )
    .join(" ");
}

export function normalize<T>(
  items: readonly T[],
  read: (item: T) => number,
  time: (item: T) => number,
) {
  const peak = items.reduce((max, item) => Math.max(max, read(item)), 0);
  return items.map((item) => ({ time: time(item), value: peak > 1e-10 ? read(item) / peak : 0 }));
}
