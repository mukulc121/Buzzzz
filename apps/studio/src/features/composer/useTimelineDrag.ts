import { useRef, useState, type PointerEvent, type RefObject } from "react";
import type { IPlaybackRange, IViewport } from "./model";
import { dragRange, dragViewport, timeAtPointer, type TimelineDrag } from "./timelineGeometry";

interface IActiveDrag {
  drag: TimelineDrag;
  pointerId: number;
  originX: number;
  left: number;
  width: number;
  end: number;
  viewport: IViewport;
  range: IPlaybackRange | null;
  playhead: number | null;
  begun: boolean;
}

type PointerHandler = (event: PointerEvent<HTMLElement>) => void;
export type TimelinePointerHandlers = Record<
  "onPointerDown" | "onPointerMove" | "onPointerUp" | "onPointerCancel" | "onLostPointerCapture",
  PointerHandler
>;

interface ITimelineDrag {
  track: RefObject<HTMLElement | null>;
  end: number;
  viewport: IViewport;
  range: IPlaybackRange | null;
  playhead: number | null;
  onViewChange: (value: IViewport) => void;
  onRangeChange: (value: IPlaybackRange | null) => void;
  onScrub: (time: number) => void;
  onBegin?: () => void;
}

export function useTimelineDrag(options: ITimelineDrag) {
  const { track, onViewChange, onRangeChange, onScrub, onBegin } = options;
  const active = useRef<IActiveDrag | null>(null);
  const [frozenEnd, setFrozenEnd] = useState<number | null>(null);
  const apply = (state: IActiveDrag, clientX: number) => {
    const { drag, end } = state;
    if (drag.kind === "scrub") {
      onScrub(timeAtPointer({ clientX, left: state.left, width: state.width, end }));
      return;
    }
    const deltaMs = ((clientX - state.originX) / Math.max(1, state.width)) * end;
    if (drag.kind === "view")
      onViewChange(dragViewport({ viewport: state.viewport, part: drag.part, deltaMs, end }));
    else if (state.range) {
      if (!state.begun && deltaMs !== 0) onBegin?.();
      state.begun ||= deltaMs !== 0;
      onRangeChange(dragRange({ range: state.range, part: drag.part, deltaMs, end }));
    }
  };
  const finish = (event: PointerEvent<HTMLElement>, cancelled: boolean) => {
    const state = active.current;
    if (!state || state.pointerId !== event.pointerId) return;
    active.current = null;
    setFrozenEnd(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    if (!cancelled) return;
    if (state.drag.kind === "view") onViewChange(state.viewport);
    else if (state.drag.kind === "range" && state.begun) onRangeChange(state.range);
    else if (state.drag.kind === "scrub" && state.playhead !== null) onScrub(state.playhead);
  };
  const bind = (drag: TimelineDrag): TimelinePointerHandlers => ({
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      const rect = track.current?.getBoundingClientRect();
      if (event.button !== 0 || active.current || !rect) return;
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.setPointerCapture(event.pointerId);
      const { end, viewport, range, playhead } = options;
      const state = {
        drag,
        pointerId: event.pointerId,
        originX: event.clientX,
        left: rect.left,
        width: rect.width,
        end,
        viewport,
        range,
        playhead,
        begun: false,
      };
      active.current = state;
      setFrozenEnd(end);
      if (drag.kind === "scrub") apply(state, event.clientX);
    },
    onPointerMove: (event: PointerEvent<HTMLElement>) => {
      const state = active.current;
      if (state?.pointerId === event.pointerId) apply(state, event.clientX);
    },
    onPointerUp: (event: PointerEvent<HTMLElement>) => finish(event, false),
    onPointerCancel: (event: PointerEvent<HTMLElement>) => finish(event, true),
    onLostPointerCapture: (event: PointerEvent<HTMLElement>) => finish(event, false),
  });
  return { bind, end: frozenEnd ?? options.end, dragging: frozenEnd !== null };
}
