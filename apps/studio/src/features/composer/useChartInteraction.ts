import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent,
  type RefObject,
} from "react";
import type { Pattern } from "@buzzzz/core";
import { selectionKey, type IChart, type PointSelection } from "./model";
import { handleChartKey } from "./chartKeyboard";
import { useChartWheel } from "./useChartWheel";
import { useChartPointer } from "./useChartPointer";
import { useChartPaste } from "./useChartPaste";
import { hitChartPoint } from "./chartMenuModel";
import { chartGeometry } from "./geometry";
import { LAYERS } from "./model";

interface IChartInteraction {
  props: IChart;
  svg: RefObject<SVGSVGElement | null>;
  width: number;
  height: number;
}

export function useChartInteraction(options: IChartInteraction) {
  const { props, svg, width, height } = options;
  const selection = props.selection ?? (props.selected ? [props.selected] : []);
  const selectionRef = useRef(selection);
  const latest = useRef(props);
  const [context, setContext] = useState<{
    x: number;
    y: number;
    px: number;
    kind: "selection" | "canvas";
  } | null>(null);
  useLayoutEffect(() => {
    latest.current = props;
    selectionRef.current = props.selection ?? (props.selected ? [props.selected] : []);
  }, [props]);

  const select = (next: PointSelection[]) => {
    if (latest.current.readOnly) return;
    selectionRef.current = next;
    latest.current.onSelectionChange?.(next);
    latest.current.onSelect(next.at(-1) ?? null);
  };
  const pointer = useChartPointer({
    svg,
    width,
    height,
    getProps: () => latest.current,
    select,
  });
  const { reset } = pointer;
  const commit = (result: { pattern: Pattern; selection: PointSelection[] }) => {
    if (latest.current.readOnly) return;
    reset();
    latest.current.onBegin();
    latest.current.onChange(result.pattern);
    select(result.selection);
  };
  const report = (error: unknown) =>
    latest.current.onError?.(
      error instanceof Error ? error.message : "Could not edit the selected points.",
    );
  const paste = useChartPaste({
    getProps: () => latest.current,
    commit,
    report,
    readOnly: props.readOnly,
  });

  const keyDown = (event: Parameters<typeof handleChartKey>[0], point?: PointSelection) =>
    handleChartKey(
      event,
      {
        getProps: () => latest.current,
        selection: selectionRef.current,
        copy: paste.copy,
        canPaste: Boolean(paste.clipboard),
        startPaste: () =>
          paste.openAt(
            (latest.current.viewStartMs ?? 0) +
              latest.current.viewMs / 2 -
              (paste.clipboard?.width ?? 0) / 2,
          ),
        cancelOverlay: () => paste.cancel() || latest.current.actions?.onCancelOverlay?.() || false,
        commit,
        select,
        reset,
        report,
      },
      point,
    );
  const shortcut = useEffectEvent((event: globalThis.KeyboardEvent) => {
    if (
      event.defaultPrevented ||
      (event.target instanceof Element &&
        event.target.closest(
          'input,select,textarea,[contenteditable],dialog[open],[role="dialog"][aria-modal="true"]',
        ))
    )
      return;
    if (
      event.key === "Escape" ||
      ((event.metaKey || event.ctrlKey) && ["c", "v"].includes(event.key.toLowerCase()))
    )
      keyDown(event);
  });
  useEffect(() => {
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);
  useChartWheel({ svg, width, height, latest });

  return {
    selection,
    ...pointer,
    select,
    commit,
    paste,
    context,
    closeMenu: () => setContext(null),
    contextMenu: (event: MouseEvent<HTMLElement | SVGSVGElement>) => {
      if (!latest.current.actions) return;
      event.preventDefault();
      if (latest.current.readOnly) return;
      const bounds = svg.current?.getBoundingClientRect();
      if (!bounds) return;
      const current = latest.current;
      const x = event.clientX - bounds.left;
      const geometry = chartGeometry({
        width,
        height,
        startMs: current.viewStartMs ?? 0,
        durationMs: current.viewMs,
      });
      const hit = hitChartPoint({
        pattern: current.pattern,
        layer: current.layer,
        visibleLayers: current.visibleLayers ?? LAYERS,
        geometry,
        x,
        y: event.clientY - bounds.top,
      });
      if (hit && !selectionRef.current.some((point) => selectionKey(point) === selectionKey(hit)))
        select([hit]);
      setContext({
        x: event.clientX,
        y: event.clientY,
        px: x,
        kind: hit || selectionRef.current.length ? "selection" : "canvas",
      });
    },
    keyDown,
    focusPoint: (point: PointSelection) => {
      if (!selectionRef.current.some((item) => selectionKey(item) === selectionKey(point)))
        select([point]);
    },
  };
}
