import { MAX_PATTERN_MS } from "@buzzzz/core";
import { MIN_VIEW_MS } from "./timelineGeometry";
import type { IViewport } from "./model";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function clampViewport(viewport: IViewport): IViewport {
  const durationMs = clamp(viewport.durationMs, MIN_VIEW_MS, MAX_PATTERN_MS);
  return { startMs: clamp(viewport.startMs, 0, MAX_PATTERN_MS - durationMs), durationMs };
}

export function zoomViewport(props: IViewport & { factor: number; anchor: number }): IViewport {
  const { startMs, durationMs, factor } = props;
  const anchor = clamp(props.anchor, 0, 1);
  const nextDuration = clamp(durationMs * factor, MIN_VIEW_MS, MAX_PATTERN_MS);
  return clampViewport({
    startMs: startMs + durationMs * anchor - nextDuration * anchor,
    durationMs: nextDuration,
  });
}

export function snapTime(timeMs: number, snapMs: number): number {
  const snapped = snapMs > 0 ? Math.round(timeMs / snapMs) * snapMs : Math.round(timeMs);
  return clamp(snapped, 0, MAX_PATTERN_MS);
}
