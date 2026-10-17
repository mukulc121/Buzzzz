import { useRef, useState, type PointerEvent, type RefObject } from "react";
import { MAX_PATTERN_MS, type Pattern } from "@buzzzz/core";
import { selectInBounds } from "./editing";
import { dragPoint, type PointDragMode } from "./pointDrag";
import { LAYERS, type IChart, type PointSelection } from "./model";
import { chartGeometry } from "./geometry";
import { snapTime } from "./viewport";
import { chartDuration, clampChartViewport } from "./chartNavigation";
import { constrainDragAxis } from "./dragAxis";

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
      pointerOrigin: { x: number; y: number };
      time: number;
      point: PointSelection;
      mode: PointDragMode;
      pattern: Pattern;
      selection: PointSelection[];
      started: boolean;
    }
  | { kind: "selection"; origin: IPosition }
  | { kind: "pan"; clientX: number; startMs: number }
  | { kind: "scrub" };

interface IChartPointer {
  svg: RefObject<SVGSVGElement | null>;
  width: number;
  height: number;
  getProps: () => IChart;
  select: (selection: PointSelection[]) => void;
}

export function useChartPointer(options: IChartPointer) {
  const { svg, width, height, getProps, select } = options;
  const drag = useRef<Drag | null>(null);
  const [rectangle, setRectangle] = useState<{ from: IPosition; to: IPosition } | null>(null);
  const position = (event: { clientX: number; clientY: number }): IPosition | null => {
    const rect = svg.current?.getBoundingClientRect();
    if (!rect) return null;
    const geometry = chartGeometry({
      width,
      height,
      startMs: getProps().viewStartMs ?? 0,
      durationMs: getProps().viewMs,
    });
    const x = Math.min(
      geometry.axisLeft + geometry.axisWidth,
      Math.max(geometry.axisLeft, event.clientX - rect.left),
    );
    const y = Math.min(geometry.bottom, Math.max(geometry.top, event.clientY - rect.top));
    return {
      x,
      y,
      time: Math.min(MAX_PATTERN_MS, Math.max(0, geometry.timeAtX(x))),
      value: geometry.valueAtY(y),
    };
  };
  const capture = (event: PointerEvent<SVGElement>) =>
    svg.current?.setPointerCapture(event.pointerId);
  const reset = () => {
    drag.current = null;
    setRectangle(null);
  };
  const grab =
    (point: PointSelection, time: number, mode: PointDragMode = "both") =>
    (event: PointerEvent<SVGElement>) => {
      if (event.button !== 0 || getProps().readOnly) return;
      event.preventDefault();
      event.stopPropagation();
      const next = [point];
      select(next);
      event.currentTarget.focus();
      const props = getProps();
      const pattern = props.pattern;
      const selectedPoint =
        point.layer === "discrete"
          ? pattern.discretePattern[point.index]
          : pattern.continuousPattern[point.layer][point.index];
      if (!selectedPoint) return;
      const value =
        "value" in selectedPoint
          ? selectedPoint.value
          : mode === "frequency"
            ? selectedPoint.frequency
            : selectedPoint.amplitude;
      const geometry = chartGeometry({
        width,
        height,
        startMs: props.viewStartMs ?? 0,
        durationMs: props.viewMs,
      });
      const origin = { x: geometry.x(time), y: geometry.y(value), time, value };
      drag.current = {
        kind: "point",
        origin,
        pointerOrigin: { x: event.clientX, y: event.clientY },
        time,
        point,
        mode,
        pattern,
        selection: next,
        started: false,
      };
      capture(event);
    };

  const backgroundDown = (event: PointerEvent<SVGSVGElement>) => {
    if (event.button !== 0 && event.button !== 1) return;
    event.preventDefault();
    svg.current?.focus();
    if (getProps().readOnly && event.button !== 1) return;
    const point = position(event);
    if (!point) return;
    if (event.button === 1) {
      drag.current = {
        kind: "pan",
        clientX: event.clientX,
        startMs: getProps().viewStartMs ?? 0,
      };
    } else {
      const bounds = svg.current?.getBoundingClientRect();
      const geometry = chartGeometry({
        width,
        height,
        startMs: getProps().viewStartMs ?? 0,
        durationMs: getProps().viewMs,
      });
      const outsidePlot =
        bounds && !geometry.containsPlot(event.clientX - bounds.left, event.clientY - bounds.top);
      const playhead = event.target instanceof Element && event.target.closest("[data-playhead]");
      if (getProps().onScrub && (outsidePlot || playhead)) {
        drag.current = { kind: "scrub" };
        getProps().onScrub?.(snapTime(point.time, getProps().snapMs ?? 0));
      } else {
        select([]);
        drag.current = { kind: "selection", origin: point };
        setRectangle({ from: point, to: point });
      }
    }
    capture(event);
  };

  const move = (event: PointerEvent<SVGSVGElement>) => {
    const action = drag.current;
    const bounds = svg.current?.getBoundingClientRect();
    const origin =
      action?.kind === "point" && bounds
        ? { x: bounds.left + action.origin.x, y: bounds.top + action.origin.y }
        : null;
    const candidate =
      action?.kind === "point" && origin
        ? {
            x: origin.x + event.clientX - action.pointerOrigin.x,
            y: origin.y + event.clientY - action.pointerOrigin.y,
          }
        : { x: event.clientX, y: event.clientY };
    const pointer =
      action?.kind === "point" && action.mode === "both" && origin
        ? constrainDragAxis({
            origin,
            position: candidate,
            shift: event.shiftKey,
          })
        : { ...candidate, lockedAxis: null };
    const point = position({ clientX: pointer.x, clientY: pointer.y });
    if (!action || !point) return;
    if (getProps().readOnly && action.kind !== "pan") {
      reset();
      return;
    }
    if (action.kind === "pan") {
      const durationMs = getProps().viewMs;
      getProps().onViewChange?.(
        clampChartViewport(
          {
            startMs:
              action.startMs -
              ((event.clientX - action.clientX) /
                chartGeometry({
                  width,
                  height,
                  startMs: action.startMs,
                  durationMs,
                }).axisWidth) *
                durationMs,
            durationMs,
          },
          chartDuration(getProps()),
        ),
      );
    } else if (action.kind === "scrub") {
      getProps().onScrub?.(snapTime(point.time, getProps().snapMs ?? 0));
    } else if (action.kind === "selection") {
      setRectangle({ from: action.origin, to: point });
      const found = selectInBounds({
        pattern: getProps().pattern,
        layers:
          getProps().multilayerSelection === false
            ? (getProps().visibleLayers ?? LAYERS).filter((item) => item === getProps().layer)
            : (getProps().visibleLayers ?? LAYERS),
        bounds: {
          startMs: Math.min(action.origin.time, point.time),
          endMs: Math.max(action.origin.time, point.time),
          minValue: Math.min(action.origin.value, point.value),
          maxValue: Math.max(action.origin.value, point.value),
        },
      });
      select(found);
    } else {
      if (
        Math.max(
          Math.abs(event.clientX - action.pointerOrigin.x),
          Math.abs(event.clientY - action.pointerOrigin.y),
        ) < 3 &&
        !action.started
      )
        return;
      if (!action.started) {
        getProps().onBegin();
        action.started = true;
      }
      getProps().onChange(
        dragPoint({
          pattern: action.pattern,
          selection: action.selection,
          point: action.point,
          mode: action.mode,
          timeMs:
            snapTime(action.time + point.time - action.origin.time, getProps().snapMs ?? 0) -
            action.time,
          value: point.value - action.origin.value,
          valueDecimals: getProps().editorSettings?.valueDecimals ?? 1,
        }),
      );
      if (action.mode === "both") return { ...point, lockedAxis: pointer.lockedAxis };
    }
  };

  return {
    rectangle,
    position,
    reset,
    grab,
    backgroundDown,
    move,
  };
}
