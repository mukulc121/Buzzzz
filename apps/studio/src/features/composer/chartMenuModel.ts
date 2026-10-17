import type { Pattern } from "@buzzzz/core";
import type { IChartGeometry } from "./geometry";
import { LAYERS, type Layer, type PointSelection } from "./model";

export function hitChartPoint(options: {
  pattern: Pattern;
  layer: Layer;
  visibleLayers: readonly Layer[];
  geometry: IChartGeometry;
  x: number;
  y: number;
}): PointSelection | null {
  const { pattern, layer, visibleLayers, geometry, x, y } = options;
  if (!visibleLayers.includes(layer)) return null;
  if (layer === "discrete") {
    const index = pattern.discretePattern.findIndex((point) => {
      const px = geometry.x(point.time);
      const top = Math.min(geometry.y(point.amplitude), geometry.y(point.frequency));
      return x >= px - 11 && x <= px + 11 && y >= top - 9 && y <= geometry.bottom;
    });
    return index < 0 ? null : { layer, index };
  }
  let closest: { index: number; distance: number } | null = null;
  for (const [index, point] of pattern.continuousPattern[layer].entries()) {
    const distance = Math.hypot(geometry.x(point.time) - x, geometry.y(point.value) - y);
    if (distance <= 9 && (!closest || distance < closest.distance)) closest = { index, distance };
  }
  return closest ? { layer, index: closest.index } : null;
}

type TCommand =
  | "undo"
  | "redo"
  | "copy"
  | "paste"
  | "bookmark"
  | "trash"
  | "marker"
  | "file"
  | "zoomIn"
  | "zoomOut"
  | "moveLeft"
  | "moveRight"
  | "selectLayer"
  | "clear";

type TMenuItem =
  | { separator: true }
  | {
      command: TCommand;
      label: string;
      shortcut?: string;
      disabled?: boolean;
      danger?: boolean;
    }
  | { command: "layer"; layer: Layer; label: string; shortcut: string; active: boolean };

export function chartMenuItems(options: {
  kind: "selection" | "canvas";
  selectionCount: number;
  clipboard: boolean;
  canUndo: boolean;
  canRedo: boolean;
  pattern: Pattern;
  activeLayer: Layer;
}): TMenuItem[] {
  const { selectionCount, clipboard, canUndo, canRedo, pattern, activeLayer } = options;
  const paste: TMenuItem = { command: "paste", label: "Paste", shortcut: "Paste" };
  const range: TMenuItem = { command: "bookmark", label: "Save range as snippet…" };
  const history: TMenuItem[] = [
    { command: "undo", label: "Undo", shortcut: "Undo", disabled: !canUndo },
    { command: "redo", label: "Redo", shortcut: "Redo", disabled: !canRedo },
    { separator: true },
  ];
  if (options.kind === "selection")
    return [
      ...history,
      { command: "copy", label: "Copy", shortcut: "Copy" },
      ...(clipboard ? [paste] : []),
      range,
      { separator: true },
      {
        command: "trash",
        label: selectionCount > 1 ? `Delete ${selectionCount} points` : "Delete",
        shortcut: "Delete selection",
        danger: true,
      },
    ];
  return [
    ...history,
    ...(clipboard ? [paste, { separator: true } satisfies TMenuItem] : []),
    { command: "marker", label: "Add marker here", shortcut: "Add marker at the cursor" },
    range,
    { separator: true },
    { command: "file", label: "Open from file…" },
    { separator: true },
    { command: "zoomIn", label: "Zoom in", shortcut: "Zoom in" },
    { command: "zoomOut", label: "Zoom out", shortcut: "Zoom out" },
    { separator: true },
    { command: "moveLeft", label: "Move left", shortcut: "Move left" },
    { command: "moveRight", label: "Move right", shortcut: "Move right" },
    { separator: true },
    ...LAYERS.map<TMenuItem>((layer, index) => ({
      command: "layer",
      layer,
      label: layer === "amplitude" ? "Intensity" : layer === "frequency" ? "Frequency" : "Discrete",
      shortcut: String(index + 1),
      active: layer === activeLayer,
    })),
    { separator: true },
    {
      command: "selectLayer",
      label: "Select active layer",
      shortcut: "Select active layer",
      disabled:
        (activeLayer === "discrete"
          ? pattern.discretePattern
          : pattern.continuousPattern[activeLayer]
        ).length === 0,
    },
    {
      command: "clear",
      label: "Clear all",
      danger: true,
      disabled:
        pattern.discretePattern.length +
          pattern.continuousPattern.amplitude.length +
          pattern.continuousPattern.frequency.length ===
        0,
    },
  ];
}
