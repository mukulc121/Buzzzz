import { patternEnd } from "@buzzzz/core";
import type { IChart, IViewport } from "./model";

interface IChartWheelNavigation {
  viewport: IViewport;
  durationMs: number;
  axisLeft: number;
  axisWidth: number;
  pointerX: number;
  event: Pick<WheelEvent, "deltaX" | "deltaY" | "metaKey" | "ctrlKey">;
}

export function chartDuration(chart: Pick<IChart, "pattern" | "markerDurationMs">): number {
  return Math.max(100, Math.ceil(Math.max(patternEnd(chart.pattern), chart.markerDurationMs ?? 0)));
}

export function clampChartViewport(viewport: IViewport, durationMs: number): IViewport {
  const span = Math.min(Math.max(viewport.durationMs, 20), durationMs);
  return {
    startMs: Math.min(Math.max(viewport.startMs, 0), Math.max(0, durationMs - span * 0.2)),
    durationMs: span,
  };
}

export function chartWheelViewport(options: IChartWheelNavigation): IViewport {
  const { viewport, durationMs, axisLeft, axisWidth, pointerX, event } = options;
  if (event.metaKey || event.ctrlKey) {
    const span = Math.min(
      Math.max(viewport.durationMs * (event.deltaY < 0 ? 1 / 1.15 : 1.15), 20),
      durationMs,
    );
    const anchor = (pointerX - axisLeft) / axisWidth;
    return clampChartViewport(
      { startMs: viewport.startMs + anchor * (viewport.durationMs - span), durationMs: span },
      durationMs,
    );
  }
  const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
  return clampChartViewport(
    { ...viewport, startMs: viewport.startMs + (delta / axisWidth) * viewport.durationMs },
    durationMs,
  );
}
