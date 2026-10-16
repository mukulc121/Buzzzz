import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import type { IChart } from "./model";
import { chartGeometry } from "./geometry";
import { clampViewport, zoomViewport } from "./viewport";

interface IChartWheel {
  svg: RefObject<SVGSVGElement | null>;
  width: number;
  height: number;
  latest: RefObject<IChart>;
  isDragging: () => boolean;
}

export function useChartWheel(options: IChartWheel) {
  const { svg, width, height, latest } = options;
  const dragging = useRef(options.isDragging);
  useLayoutEffect(() => {
    dragging.current = options.isDragging;
  }, [options.isDragging]);

  useEffect(() => {
    const element = svg.current;
    if (!element) return;
    const wheel = (event: WheelEvent) => {
      const current = latest.current;
      if (!current.onViewChange || dragging.current()) return;
      event.preventDefault();
      const viewport = { startMs: current.viewStartMs ?? 0, durationMs: current.viewMs };
      const geometry = chartGeometry({ width, height, ...viewport });
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? height : 1;
      if (event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
        current.onViewChange(
          clampViewport({
            ...viewport,
            startMs:
              viewport.startMs +
              (((event.deltaX || event.deltaY) * unit) / geometry.axisWidth) * viewport.durationMs,
          }),
        );
      } else {
        const bounds = element.getBoundingClientRect();
        current.onViewChange(
          zoomViewport({
            ...viewport,
            factor: Math.exp(event.deltaY * unit * 0.002),
            anchor: (event.clientX - bounds.left - geometry.axisLeft) / geometry.axisWidth,
          }),
        );
      }
    };
    element.addEventListener("wheel", wheel, { passive: false });
    return () => element.removeEventListener("wheel", wheel);
  }, [svg, width, height, latest]);
}
