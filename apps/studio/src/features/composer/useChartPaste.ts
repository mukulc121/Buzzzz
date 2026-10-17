import { useEffect, useRef, useState, type PointerEvent } from "react";
import type { Pattern } from "@buzzzz/core";
import type { IChartGeometry } from "./geometry";
import type { IChart, PointSelection } from "./model";
import {
  applyChartPaste,
  copyChartRange,
  type IChartClipboard,
  type TPasteMode,
} from "./pasteModel";

interface IChartPaste {
  getProps: () => IChart;
  commit: (result: { pattern: Pattern; selection: PointSelection[] }) => void;
  report: (error: unknown) => void;
  readOnly?: boolean;
}

export function useChartPaste(options: IChartPaste) {
  const [localClipboard, setClipboard] = useState<IChartClipboard | null>(null);
  const [preview, setPreview] = useState<{ start: number; mode: TPasteMode } | null>(null);
  const [readOnly, setReadOnly] = useState(options.readOnly);
  if (readOnly !== options.readOnly) {
    setReadOnly(options.readOnly);
    setPreview(null);
  }
  const drag = useRef<{ clientX: number; start: number } | null>(null);
  const controlled = options.getProps().actions?.clipboard;
  const clipboard = controlled === undefined ? localClipboard : controlled;
  const cancel = () => {
    if (!preview) return false;
    setPreview(null);
    drag.current = null;
    return true;
  };
  useEffect(() => {
    if (options.readOnly) {
      drag.current = null;
    }
  }, [options.readOnly]);
  const copy = (selection: readonly PointSelection[]) => {
    const props = options.getProps();
    if (props.readOnly) return;
    const value = copyChartRange({
      pattern: props.pattern,
      selection,
      valueDecimals: props.editorSettings?.valueDecimals ?? 1,
    });
    if (!value) return;
    setClipboard(value);
    props.actions?.onCopy?.(value);
  };
  const openAt = (timeMs: number) => {
    if (!clipboard || options.getProps().readOnly) return;
    setPreview({ start: Math.max(0, Math.round(timeMs)), mode: "both" });
  };
  const apply = () => {
    const props = options.getProps();
    if (!preview || !clipboard || props.readOnly) return;
    try {
      options.commit({
        pattern: applyChartPaste({
          pattern: props.pattern,
          clipboard,
          startMs: preview.start,
          mode: preview.mode,
        }),
        selection: [],
      });
      cancel();
    } catch (error) {
      options.report(error);
    }
  };
  const down = (event: PointerEvent<SVGSVGElement>, geometry: IChartGeometry) => {
    if (!preview) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.button !== 0 || !clipboard) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;
    const left = geometry.x(preview.start);
    const right = geometry.x(preview.start + clipboard.width);
    if (
      x < Math.min(left, right) - 3 ||
      x > Math.max(left, right) + 3 ||
      y < geometry.top ||
      y > geometry.bottom
    )
      return;
    drag.current = { clientX: event.clientX, start: preview.start };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const move = (event: PointerEvent<SVGSVGElement>, geometry: IChartGeometry) => {
    if (!preview) return;
    event.stopPropagation();
    const current = drag.current;
    if (!current || options.getProps().readOnly) return;
    const start =
      current.start +
      ((event.clientX - current.clientX) / geometry.axisWidth) * geometry.durationMs;
    setPreview({ ...preview, start: Math.max(0, Math.round(start)) });
  };
  return {
    clipboard,
    preview: options.readOnly ? null : preview,
    copy,
    openAt,
    cancel,
    apply,
    setMode: (mode: TPasteMode) => setPreview((value) => (value ? { ...value, mode } : null)),
    down,
    move,
    resetDrag: () => {
      drag.current = null;
    },
  };
}
