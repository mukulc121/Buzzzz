import type { KeyboardEvent } from "react";
import { isPattern, MAX_PATTERN_MS, patternEnd, type Pattern } from "@buzzzz/core";
import {
  copySelection,
  deleteSelection,
  duplicateSelection,
  moveSelection,
  selectInBounds,
} from "./editing";
import { LAYERS, selectionKey, type IChart, type PointSelection } from "./model";
import { clampViewport, zoomViewport } from "./viewport";

interface IChartKeyboard {
  getProps: () => IChart;
  selection: readonly PointSelection[];
  clipboard: { current: Pattern | null };
  commit: (result: { pattern: Pattern; selection: PointSelection[] }) => void;
  select: (selection: PointSelection[]) => void;
  reset: () => void;
  report: (error: unknown) => void;
  paste: (pattern: Pattern) => void;
}

export function handleChartKey(
  event: KeyboardEvent<SVGElement>,
  options: IChartKeyboard,
  point?: PointSelection,
) {
  const { getProps, selection, clipboard, commit, select, reset, report, paste } = options;
  const current = getProps();
  const active =
    point && !selection.some((item) => selectionKey(item) === selectionKey(point))
      ? [point]
      : [...selection];
  const key = event.key.toLowerCase();
  const modifier = event.metaKey || event.ctrlKey;
  const step =
    (current.snapMs && current.snapMs > 0 ? current.snapMs : 10) * (event.shiftKey ? 10 : 1);
  const valueStep =
    (event.shiftKey ? 10 : 1) / (100 * 10 ** (current.editorSettings?.valueDecimals ?? 1));
  const handled = () => {
    event.preventDefault();
    event.stopPropagation();
  };
  if (key === "escape") {
    handled();
    reset();
    select([]);
  } else if (point && (key === "enter" || key === " ")) {
    handled();
    select(active.length ? active : [point]);
  } else if (modifier && key === "a") {
    handled();
    select(
      selectInBounds({
        pattern: current.pattern,
        layers: (current.visibleLayers ?? LAYERS).filter((layer) => layer === current.layer),
        bounds: { startMs: 0, endMs: MAX_PATTERN_MS, minValue: 0, maxValue: 1 },
      }),
    );
  } else if (modifier && (key === "c" || key === "x") && active.length) {
    handled();
    clipboard.current = copySelection({ pattern: current.pattern, selection: active });
    void navigator.clipboard?.writeText(JSON.stringify(clipboard.current)).catch(() => {});
    if (key === "x")
      commit({
        pattern: deleteSelection({ pattern: current.pattern, selection: active }),
        selection: [],
      });
  } else if (modifier && key === "v") {
    handled();
    if (clipboard.current) paste(clipboard.current);
    else if (navigator.clipboard) {
      const initialPattern = current.pattern;
      void navigator.clipboard
        .readText()
        .then((text) => {
          const value: unknown = JSON.parse(text);
          if (!isPattern(value)) throw new Error("Copy a valid Pulsar pattern before pasting.");
          if (getProps().pattern !== initialPattern) return;
          clipboard.current = value;
          paste(value);
        })
        .catch(report);
    }
  } else if (modifier && key === "d" && active.length) {
    handled();
    try {
      commit(duplicateSelection({ pattern: current.pattern, selection: active, offsetMs: step }));
    } catch (error) {
      report(error);
    }
  } else if ((key === "delete" || key === "backspace") && active.length) {
    handled();
    commit({
      pattern: deleteSelection({ pattern: current.pattern, selection: active }),
      selection: [],
    });
  } else if (["arrowleft", "arrowright", "arrowup", "arrowdown"].includes(key) && active.length) {
    handled();
    commit({
      pattern: moveSelection({
        pattern: current.pattern,
        selection: active,
        timeMs: key === "arrowright" ? step : key === "arrowleft" ? -step : 0,
        value: key === "arrowup" ? valueStep : key === "arrowdown" ? -valueStep : 0,
        valueDecimals: current.editorSettings?.valueDecimals ?? 1,
      }),
      selection: active,
    });
  } else if (current.onScrub && (key === "home" || key === "end")) {
    handled();
    current.onScrub(key === "home" ? 0 : patternEnd(current.pattern));
  } else if (current.onViewChange && ["+", "=", "-", "0"].includes(key)) {
    handled();
    const viewport = { startMs: current.viewStartMs ?? 0, durationMs: current.viewMs };
    current.onViewChange(
      key === "0"
        ? clampViewport({
            startMs: 0,
            durationMs: Math.max(1000, patternEnd(current.pattern) + 250),
          })
        : zoomViewport({ ...viewport, factor: key === "-" ? 1.5 : 1 / 1.5, anchor: 0.5 }),
    );
  }
}
