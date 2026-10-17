import { emptyPattern, type Pattern } from "@buzzzz/core";
import { ContextMenu } from "../../components/ContextMenu";
import { ContextMenuIcon } from "../../components/ContextMenuIcon";
import { settingsShortcuts } from "../settings/shortcutDisplay";
import { chartMenuItems } from "./chartMenuModel";
import { chartDuration, clampChartViewport } from "./chartNavigation";
import { deleteSelection } from "./editing";
import type { IChartGeometry } from "./geometry";
import type { IChart, PointSelection } from "./model";

interface IChartContextMenu {
  context: { x: number; y: number; px: number; kind: "selection" | "canvas" };
  chart: IChart;
  geometry: IChartGeometry;
  selection: readonly PointSelection[];
  clipboard: boolean;
  onClose: () => void;
  select: (selection: PointSelection[]) => void;
  commit: (result: { pattern: Pattern; selection: PointSelection[] }) => void;
  copy: (selection: readonly PointSelection[]) => void;
  pasteAt: (timeMs: number) => void;
}

export function ChartContextMenu(props: IChartContextMenu) {
  const { chart, context, geometry, selection } = props;
  const actions = chart.actions;
  if (!actions || chart.readOnly) return null;
  const shortcuts = settingsShortcuts(/Mac|iPhone|iPad|iPod/.test(navigator.userAgent));
  const zoom = (factor: number) => {
    const duration = chartDuration(chart);
    const span = Math.min(Math.max(chart.viewMs * factor, 20), duration);
    const anchor = (context.px - geometry.axisLeft) / geometry.axisWidth;
    chart.onViewChange?.(
      clampChartViewport(
        { startMs: (chart.viewStartMs ?? 0) + anchor * (chart.viewMs - span), durationMs: span },
        duration,
      ),
    );
  };
  const items = chartMenuItems({
    kind: context.kind,
    selectionCount: selection.length,
    clipboard: props.clipboard,
    canUndo: actions.canUndo,
    canRedo: actions.canRedo,
    pattern: chart.pattern,
    activeLayer: chart.layer,
  }).map((item) => {
    if ("separator" in item) return item;
    const onSelect = () => {
      if (chart.readOnly) return;
      switch (item.command) {
        case "undo":
          return actions.onUndo();
        case "redo":
          return actions.onRedo();
        case "copy":
          return props.copy(selection);
        case "paste":
          return props.pasteAt(geometry.timeAtX(context.px));
        case "bookmark":
          return actions.onSaveRange();
        case "trash":
          return props.commit({
            pattern: deleteSelection({ pattern: chart.pattern, selection }),
            selection: [],
          });
        case "marker":
          return actions.onAddMarker(geometry.timeAtX(context.px));
        case "file":
          return actions.onOpenFile();
        case "zoomIn":
          return zoom(0.6);
        case "zoomOut":
          return zoom(1 / 0.6);
        case "moveLeft":
        case "moveRight":
          return chart.onViewChange?.(
            clampChartViewport(
              {
                startMs:
                  (chart.viewStartMs ?? 0) +
                  chart.viewMs * (item.command === "moveLeft" ? -0.25 : 0.25),
                durationMs: chart.viewMs,
              },
              chartDuration(chart),
            ),
          );
        case "layer":
          return actions.onLayerChange(item.layer);
        case "selectLayer": {
          const points =
            chart.layer === "discrete"
              ? chart.pattern.discretePattern
              : chart.pattern.continuousPattern[chart.layer];
          return props.select(points.map((_, index) => ({ layer: chart.layer, index })));
        }
        case "clear":
          return props.commit({ pattern: emptyPattern(), selection: [] });
        default: {
          const exhaustive: never = item;
          return exhaustive;
        }
      }
    };
    const shortcut =
      item.command === "layer"
        ? item.shortcut
        : shortcuts.find(([label]) => label === item.shortcut)?.[1];
    return {
      label: item.label,
      icon: (
        <ContextMenuIcon
          name={
            item.command === "layer"
              ? item.active
                ? "activeLayer"
                : "inactiveLayer"
              : item.command
          }
        />
      ),
      shortcut,
      disabled: "disabled" in item ? item.disabled : undefined,
      danger: "danger" in item ? item.danger : undefined,
      onSelect,
    };
  });
  return <ContextMenu x={context.x} y={context.y} items={items} onClose={props.onClose} />;
}
