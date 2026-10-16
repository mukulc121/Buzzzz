import { useRef, type KeyboardEvent, type PointerEvent } from "react";
import type { ITimelineMarker } from "./model";

interface IMarkerDrag {
  marker: ITimelineMarker;
  minTime?: number;
  maxTime: number;
  timeAtClientX: (clientX: number) => number;
  onBegin?: () => void;
  onMove?: (id: string, time: number) => void;
}

export function useMarkerDrag(options: IMarkerDrag) {
  const active = useRef<{
    pointerId: number;
    clientX: number;
    time: number;
    started: boolean;
  } | null>(null);
  const update = (time: number) =>
    options.onMove?.(
      options.marker.id,
      Math.max(options.minTime ?? 0, Math.min(options.maxTime, Math.round(time))),
    );
  const finish = (event: PointerEvent<SVGElement | HTMLElement>, cancel: boolean) => {
    const drag = active.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    active.current = null;
    if (cancel && drag.started) update(drag.time);
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  };
  return {
    onPointerDown: (event: PointerEvent<SVGElement | HTMLElement>) => {
      if (!options.onMove || event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.focus();
      event.currentTarget.setPointerCapture(event.pointerId);
      active.current = {
        pointerId: event.pointerId,
        clientX: event.clientX,
        time: options.marker.time,
        started: false,
      };
    },
    onPointerMove: (event: PointerEvent<SVGElement | HTMLElement>) => {
      const drag = active.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      event.stopPropagation();
      if (!drag.started && Math.abs(event.clientX - drag.clientX) < 3) return;
      if (!drag.started) options.onBegin?.();
      drag.started = true;
      update(
        drag.time + options.timeAtClientX(event.clientX) - options.timeAtClientX(drag.clientX),
      );
    },
    onPointerUp: (event: PointerEvent<SVGElement | HTMLElement>) => finish(event, false),
    onPointerCancel: (event: PointerEvent<SVGElement | HTMLElement>) => finish(event, true),
    onLostPointerCapture: (event: PointerEvent<SVGElement | HTMLElement>) => finish(event, false),
    onKeyDown: (event: KeyboardEvent<SVGElement | HTMLElement>) => {
      if (!options.onMove || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))
        return;
      event.preventDefault();
      event.stopPropagation();
      options.onBegin?.();
      if (event.key === "Home") update(0);
      else if (event.key === "End") update(options.maxTime);
      else
        update(
          options.marker.time + (event.key === "ArrowRight" ? 1 : -1) * (event.shiftKey ? 100 : 10),
        );
    },
  };
}
