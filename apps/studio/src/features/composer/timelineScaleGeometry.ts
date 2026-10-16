import type { IViewport } from "./model";
import { MIN_VIEW_MS } from "./timelineGeometry";

interface ITimelineScrollbar {
  thumbWidth: number;
  thumbLeft: number;
  travel: number;
  maxStart: number;
}

export function fitTimelineView(view: IViewport | null, extent: number): IViewport {
  const durationMs = Math.min(extent, Math.max(MIN_VIEW_MS, view?.durationMs ?? extent));
  return { startMs: Math.max(0, Math.min(extent - durationMs, view?.startMs ?? 0)), durationMs };
}

export function zoomTimelineView(
  view: IViewport,
  extent: number,
  factor: number,
  anchor: number,
): IViewport {
  const durationMs = Math.min(extent, Math.max(MIN_VIEW_MS, view.durationMs * factor));
  return fitTimelineView(
    { startMs: view.startMs + (view.durationMs - durationMs) * anchor, durationMs },
    extent,
  );
}

export function timelineScrollbar(
  view: IViewport,
  extent: number,
  width: number,
): ITimelineScrollbar | null {
  if (view.durationMs >= extent - 0.5 || width <= 0) return null;
  const maxStart = Math.max(0, extent - view.durationMs);
  const thumbWidth = Math.max(12, (view.durationMs / extent) * width);
  const travel = width - thumbWidth;
  return {
    thumbWidth,
    thumbLeft: maxStart > 0 ? (view.startMs / maxStart) * travel : 0,
    travel,
    maxStart,
  };
}

export function timelineStartForThumb(left: number, scrollbar: ITimelineScrollbar): number {
  return scrollbar.travel > 0
    ? Math.max(0, Math.min(scrollbar.maxStart, (left / scrollbar.travel) * scrollbar.maxStart))
    : 0;
}
