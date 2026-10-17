import { useLayoutEffect, useRef, type KeyboardEvent, type RefObject } from "react";
import type { Pattern } from "@buzzzz/core";
import { pasteSelection } from "./editing";
import { selectionKey, type IChart, type PointSelection } from "./model";
import { handleChartKey } from "./chartKeyboard";
import { useChartWheel } from "./useChartWheel";
import { useChartPointer } from "./useChartPointer";

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
  const clipboard = useRef<Pattern | null>(null);
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
    getSelection: () => selectionRef.current,
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
  const paste = (pattern: Pattern) => {
    try {
      commit(
        pasteSelection({
          pattern: latest.current.pattern,
          clipboard: pattern,
          atMs: latest.current.playhead ?? latest.current.viewStartMs ?? 0,
        }),
      );
    } catch (error) {
      report(error);
    }
  };

  const keyDown = (event: KeyboardEvent<SVGElement>, point?: PointSelection) =>
    handleChartKey(
      event,
      {
        getProps: () => latest.current,
        selection: selectionRef.current,
        clipboard,
        commit,
        select,
        reset,
        report,
        paste,
      },
      point,
    );
  useChartWheel({ svg, width, height, latest });

  return {
    selection,
    ...pointer,
    select,
    keyDown,
    focusPoint: (point: PointSelection) => {
      if (!selectionRef.current.some((item) => selectionKey(item) === selectionKey(point)))
        select([point]);
    },
  };
}
