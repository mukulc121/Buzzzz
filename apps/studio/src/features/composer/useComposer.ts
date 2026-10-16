import { useState, type SetStateAction } from "react";
import { MAX_PATTERN_MS, patternEnd, type Pattern, type IPresetEditor } from "@buzzzz/core";
import type {
  Layer,
  Selection,
  PointSelection,
  IPlaybackRange,
  ITimelineMarker,
  IViewport,
} from "./model";

export function useComposer(
  pattern: Pattern,
  editor: IPresetEditor | undefined,
  onEditorChange: (value: IPresetEditor) => void,
) {
  const [layer, setLayer] = useState<Layer>("amplitude");
  const [selected, setSelected] = useState<Selection>(null);
  const [selection, setSelection] = useState<PointSelection[]>([]);
  const [visibleLayers, setVisibleLayers] = useState<Layer[]>([
    "amplitude",
    "frequency",
    "discrete",
  ]);
  const [viewport, setViewport] = useState<IViewport>({ startMs: 0, durationMs: 2000 });
  const range = editor?.range ?? null;
  const markers = editor?.markers ?? [];
  const setRange = (value: IPlaybackRange | null) =>
    onEditorChange({ markers, ...editor, range: value });
  const setMarkers = (value: SetStateAction<ITimelineMarker[]>) =>
    onEditorChange({
      range,
      ...editor,
      markers: typeof value === "function" ? value(markers) : value,
    });
  const [snapMs, setSnapMs] = useState(0);
  const select = (point: Selection) => {
    setSelected(point);
    setSelection(point ? [point] : []);
  };
  const fit = (duration = patternEnd(pattern)) =>
    setViewport({
      startMs: 0,
      durationMs: Math.min(MAX_PATTERN_MS, Math.max(1000, Math.ceil((duration + 100) / 500) * 500)),
    });
  const zoom = (factor: number) =>
    setViewport((view) => ({
      ...view,
      durationMs: Math.min(MAX_PATTERN_MS, Math.max(100, view.durationMs * factor)),
    }));
  const pan = (direction: number) =>
    setViewport((view) => ({
      ...view,
      startMs: Math.max(
        0,
        Math.min(
          MAX_PATTERN_MS - view.durationMs,
          view.startMs + (direction * view.durationMs) / 4,
        ),
      ),
    }));
  const toggleLayer = (value: Layer) =>
    setVisibleLayers((layers) =>
      layers.includes(value) ? layers.filter((item) => item !== value) : [...layers, value],
    );
  const addMarker = (time: number) =>
    setMarkers((items) => [
      ...items,
      {
        id: crypto.randomUUID(),
        time: Math.max(0, Math.min(MAX_PATTERN_MS, time)),
        label: `Marker ${items.length + 1}`,
      },
    ]);
  return {
    layer,
    setLayer,
    selected,
    setSelected: select,
    selection,
    setSelection,
    visibleLayers,
    toggleLayer,
    viewport,
    setViewport,
    range,
    setRange,
    markers,
    setMarkers,
    snapMs,
    setSnapMs,
    fit,
    zoom,
    pan,
    addMarker,
  };
}
