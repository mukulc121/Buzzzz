import { useRef, useState, type PointerEvent, type RefObject } from "react";
import { MAX_PATTERN_MS, type Pattern } from "@buzzzz/core";
import { moveSelection, selectInBounds } from "./editing";
import { LAYERS, selectionKey, type IChart, type IViewport, type PointSelection } from "./model";
import { CHART_PADDING } from "./geometry";
import { clampViewport, snapTime } from "./viewport";

interface IPosition {
  x: number;
  y: number;
  time: number;
  value: number;
}

type Drag =
  | {
      kind: "point";
      origin: IPosition;
      pattern: Pattern;
      selection: PointSelection[];
      started: boolean;
    }
  | { kind: "selection"; origin: IPosition; initial: PointSelection[] }
  | { kind: "pan"; clientX: number; viewport: IViewport }
  | { kind: "scrub" };

interface IChartPointer {
  svg: RefObject<SVGSVGElement | null>;
  width: number;
  height: number;
  getProps: () => IChart;
  getSelection: () => readonly PointSelection[];
  select: (selection: PointSelection[]) => void;
}

export function useChartPointer(options: IChartPointer) {
  const { svg, width, height, getProps, getSelection, select } = options;
  const drag = useRef<Drag | null>(null);
  const [rectangle, setRectangle] = useState<{ from: IPosition; to: IPosition } | null>(null);
  const position = (event: { clientX: number; clientY: number }): IPosition | null => {
    const rect = svg.current?.getBoundingClientRect();
    if (!rect) return null;
    const x = Math.min(width - CHART_PADDING, Math.max(CHART_PADDING, event.clientX - rect.left));
    const y = Math.min(height - CHART_PADDING, Math.max(CHART_PADDING, event.clientY - rect.top));
    return {
      x,
      y,
      time: Math.min(
        MAX_PATTERN_MS,
        Math.max(
          0,
          (getProps().viewStartMs ?? 0) +
            ((x - CHART_PADDING) / Math.max(1, width - 2 * CHART_PADDING)) * getProps().viewMs,
        ),
      ),
      value: 1 - (y - CHART_PADDING) / Math.max(1, height - 2 * CHART_PADDING),
    };
  };
  const capture = (event: PointerEvent<SVGElement>) =>
    svg.current?.setPointerCapture(event.pointerId);
  const reset = () => {
    drag.current = null;
    setRectangle(null);
  };
  const grab =
    (point: PointSelection, time: number, value: number) => (event: PointerEvent<SVGElement>) => {
      if (event.button !== 0 || event.altKey) return;
      event.preventDefault();
      event.stopPropagation();
      const found = getSelection().some((item) => selectionKey(item) === selectionKey(point));
      const additive = event.shiftKey || event.metaKey || event.ctrlKey;
      const next = additive
        ? found
          ? getSelection().filter((item) => selectionKey(item) !== selectionKey(point))
          : [...getSelection(), point]
        : found
          ? [...getSelection()]
          : [point];
      select(next);
      event.currentTarget.focus();
      if (additive && found) return;
      const origin = position(event);
      if (!origin) return;
      drag.current = {
        kind: "point",
        origin: { ...origin, time, value },
        pattern: getProps().pattern,
        selection: next,
        started: false,
      };
      capture(event);
    };

  const backgroundDown = (event: PointerEvent<SVGSVGElement>) => {
    if (event.button !== 0 && event.button !== 1) return;
    event.preventDefault();
    svg.current?.focus();
    const point = position(event);
    if (!point) return;
    if (event.altKey || event.button === 1) {
      drag.current = {
        kind: "pan",
        clientX: event.clientX,
        viewport: { startMs: getProps().viewStartMs ?? 0, durationMs: getProps().viewMs },
      };
    } else {
      const bounds = svg.current?.getBoundingClientRect();
      const outsidePlot =
        bounds &&
        (event.clientY - bounds.top < CHART_PADDING ||
          event.clientY - bounds.top > height - CHART_PADDING);
      const playhead = event.target instanceof Element && event.target.closest("[data-playhead]");
      if (getProps().onScrub && (outsidePlot || playhead)) {
        drag.current = { kind: "scrub" };
        getProps().onScrub?.(snapTime(point.time, getProps().snapMs ?? 0));
      } else {
        const initial = event.shiftKey || event.metaKey || event.ctrlKey ? [...getSelection()] : [];
        select(initial);
        drag.current = { kind: "selection", origin: point, initial };
        setRectangle({ from: point, to: point });
      }
    }
    capture(event);
  };

  const move = (event: PointerEvent<SVGSVGElement>) => {
    const action = drag.current;
    const point = position(event);
    if (!action || !point) return;
    if (action.kind === "pan") {
      getProps().onViewChange?.(
        clampViewport({
          startMs:
            action.viewport.startMs -
            ((event.clientX - action.clientX) / Math.max(1, width - 2 * CHART_PADDING)) *
              action.viewport.durationMs,
          durationMs: action.viewport.durationMs,
        }),
      );
    } else if (action.kind === "scrub") {
      getProps().onScrub?.(snapTime(point.time, getProps().snapMs ?? 0));
    } else if (action.kind === "selection") {
      setRectangle({ from: action.origin, to: point });
      const found = selectInBounds({
        pattern: getProps().pattern,
        layers: getProps().visibleLayers ?? LAYERS,
        bounds: {
          startMs: Math.min(action.origin.time, point.time),
          endMs: Math.max(action.origin.time, point.time),
          minValue: Math.min(action.origin.value, point.value),
          maxValue: Math.max(action.origin.value, point.value),
        },
      });
      const combined = new Map(
        [...action.initial, ...found].map((item) => [selectionKey(item), item]),
      );
      select([...combined.values()]);
    } else {
      if (Math.hypot(point.x - action.origin.x, point.y - action.origin.y) < 2 && !action.started)
        return;
      if (!action.started) {
        getProps().onBegin();
        action.started = true;
      }
      getProps().onChange(
        moveSelection({
          pattern: action.pattern,
          selection: action.selection,
          timeMs: snapTime(point.time, getProps().snapMs ?? 0) - action.origin.time,
          value: point.value - action.origin.value,
        }),
      );
    }
  };

  return {
    rectangle,
    position,
    reset,
    grab,
    backgroundDown,
    move,
    isDragging: () => drag.current !== null,
  };
}
