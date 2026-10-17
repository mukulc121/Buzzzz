import type { Pattern } from "@buzzzz/core";
import type { IEditorSettings } from "./editorSettings";

export type Layer = "amplitude" | "frequency" | "discrete";
export type Selection = { layer: Layer; index: number } | null;
export type PointSelection = NonNullable<Selection>;

export interface IViewport {
  startMs: number;
  durationMs: number;
}

export interface IPlaybackRange {
  start: number;
  end: number;
}

export interface ITimelineMarker {
  id: string;
  time: number;
  label: string;
}

export interface ISelectionBounds {
  startMs: number;
  endMs: number;
  minValue: number;
  maxValue: number;
}

export interface IAnalysisCurve {
  id: string;
  label: string;
  color: string;
  points: readonly { time: number; value: number }[];
}

export interface IMarkerActions {
  onMarkerMove?: (id: string, time: number) => void;
  onMarkerRename?: (id: string, label: string) => void;
}

export interface IChart extends IMarkerActions {
  pattern: Pattern;
  patternSegments?: readonly Pattern[];
  readOnly?: boolean;
  getPlayhead?: () => number | null;
  layer: Layer;
  viewMs: number;
  selected: Selection;
  playhead: number | null;
  onSelect: (selection: Selection) => void;
  onBegin: () => void;
  onChange: (pattern: Pattern) => void;
  viewStartMs?: number;
  onScrub?: (timeMs: number) => void;
  selection?: readonly PointSelection[];
  onSelectionChange?: (selection: PointSelection[]) => void;
  visibleLayers?: readonly Layer[];
  multilayerSelection?: boolean;
  editorSettings?: IEditorSettings;
  snapMs?: number;
  playbackRange?: IPlaybackRange;
  markers?: readonly ITimelineMarker[];
  markerDurationMs?: number;
  onViewChange?: (viewport: IViewport) => void;
  onError?: (message: string) => void;
  analysisCurves?: readonly IAnalysisCurve[];
}

export const LAYERS: readonly Layer[] = ["amplitude", "frequency", "discrete"];
export const selectionKey = (point: PointSelection) => `${point.layer}:${point.index}`;

export const COLORS: Record<Layer, string> = {
  amplitude: "var(--amp)",
  frequency: "var(--freq)",
  discrete: "var(--discrete)",
};
