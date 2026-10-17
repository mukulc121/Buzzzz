import { useEffect, type RefObject } from "react";
import type { IChart } from "./model";
import { chartGeometry } from "./geometry";
import { chartDuration, chartWheelViewport } from "./chartNavigation";

interface IChartWheel {
  svg: RefObject<SVGSVGElement | null>;
  width: number;
  height: number;
  latest: RefObject<IChart>;
}

export function useChartWheel(options: IChartWheel) {
  const { svg, width, height, latest } = options;
  useEffect(() => {
    const element = svg.current;
    if (!element) return;
    const wheel = (event: WheelEvent) => {
      const current = latest.current;
      if (!current.onViewChange) return;
      event.preventDefault();
      const viewport = { startMs: current.viewStartMs ?? 0, durationMs: current.viewMs };
      const geometry = chartGeometry({ width, height, ...viewport });
      const bounds = element.getBoundingClientRect();
      current.onViewChange(
        chartWheelViewport({
          viewport,
          durationMs: chartDuration(current),
          axisLeft: geometry.axisLeft,
          axisWidth: geometry.axisWidth,
          pointerX: event.clientX - bounds.left,
          event,
        }),
      );
    };
    element.addEventListener("wheel", wheel, { passive: false });
    return () => element.removeEventListener("wheel", wheel);
  }, [svg, width, height, latest]);
}
