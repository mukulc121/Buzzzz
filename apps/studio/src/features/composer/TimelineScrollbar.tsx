import { useLayoutEffect, useRef, useState, type PointerEvent } from "react";
import type { IViewport } from "./model";
import { keyDelta } from "./timelineGeometry";
import { timelineScrollbar, timelineStartForThumb } from "./timelineScaleGeometry";

interface ITimelineScrollbar {
  view: IViewport;
  extent: number;
  onStartChange: (startMs: number) => void;
}

interface IScrollbarDrag {
  pointerId: number;
  originX: number;
  startMs: number;
  scrollbar: NonNullable<ReturnType<typeof timelineScrollbar>>;
}

export function TimelineScrollbar(props: ITimelineScrollbar) {
  const { view, extent, onStartChange } = props;
  const track = useRef<HTMLDivElement>(null);
  const active = useRef<IScrollbarDrag | null>(null);
  const [width, setWidth] = useState(0);
  const scrollbar = timelineScrollbar(view, extent, width);
  useLayoutEffect(() => {
    const element = track.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry?.contentRect.width ?? 0));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const finish = (event: PointerEvent<HTMLDivElement>, cancelled: boolean) => {
    const drag = active.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    active.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    if (cancelled) onStartChange(drag.startMs);
  };
  return (
    <div className="timeline-scrollbar" ref={track} data-visible={scrollbar ? true : undefined}>
      {scrollbar && (
        <div
          className="timeline-scrollbar-thumb"
          style={{ left: scrollbar.thumbLeft, width: scrollbar.thumbWidth }}
          role="slider"
          tabIndex={0}
          aria-label="Timeline scroll position"
          aria-orientation="horizontal"
          aria-valuemin={0}
          aria-valuemax={scrollbar.maxStart}
          aria-valuenow={view.startMs}
          aria-valuetext={`${Math.round(view.startMs)} milliseconds`}
          onKeyDown={(event) => {
            const delta = keyDelta(event.key, event.shiftKey);
            if (delta === null) return;
            event.preventDefault();
            event.stopPropagation();
            onStartChange(Math.max(0, Math.min(scrollbar.maxStart, view.startMs + delta)));
          }}
          onPointerDown={(event) => {
            if (event.button !== 0 || active.current) return;
            event.preventDefault();
            event.stopPropagation();
            event.currentTarget.setPointerCapture(event.pointerId);
            active.current = {
              pointerId: event.pointerId,
              originX: event.clientX,
              startMs: view.startMs,
              scrollbar,
            };
          }}
          onPointerMove={(event) => {
            const drag = active.current;
            if (!drag || drag.pointerId !== event.pointerId) return;
            onStartChange(
              timelineStartForThumb(
                drag.scrollbar.thumbLeft + event.clientX - drag.originX,
                drag.scrollbar,
              ),
            );
          }}
          onPointerUp={(event) => finish(event, false)}
          onPointerCancel={(event) => finish(event, true)}
          onLostPointerCapture={(event) => finish(event, false)}
        />
      )}
    </div>
  );
}
