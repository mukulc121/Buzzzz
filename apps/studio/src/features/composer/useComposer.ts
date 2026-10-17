import { randomUUID } from "../../crypto";
import { useState, type SetStateAction } from "react";
import { MAX_PATTERN_MS, patternEnd, type Pattern, type IPresetEditor } from "@buzzzz/core";
import type { Layer, Selection, PointSelection, IPlaybackRange, ITimelineMarker } from "./model";
import { MIN_VIEW_MS } from "./timelineGeometry";
import { useEditorSettings } from "./useEditorSettings";
import { nextMarkerLabel } from "./markers";
import { useComposerView } from "./useComposerView";
import type { IChartClipboard } from "./pasteModel";

export function useComposer(
  pattern: Pattern,
  editor: IPresetEditor | undefined,
  onEditorChange: (value: IPresetEditor) => void,
  instanceKey = "editor",
  displayDurationMs = 0,
) {
  const [layer, setLayer] = useState<Layer>("amplitude");
  const [selected, setSelected] = useState<Selection>(null);
  const [selection, setSelection] = useState<PointSelection[]>([]);
  const [clipboard, setClipboard] = useState<IChartClipboard | null>(null);
  const settings = useEditorSettings();
  const multilayerSelection = settings.values.multilayerSelection;
  const setMultilayerSelection = (value: boolean) => settings.update("multilayerSelection", value);
  const [visibleLayers, setVisibleLayers] = useState<Layer[]>([
    "amplitude",
    "frequency",
    "discrete",
  ]);
  const { viewport, setViewport, cursor, setCursor } = useComposerView(
    instanceKey,
    Math.max(patternEnd(pattern), editor?.durationMs ?? 0, displayDurationMs),
  );
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
  const moveMarker = (id: string, time: number) =>
    setMarkers((items) =>
      items
        .map((item) => (item.id === id ? { ...item, time } : item))
        .sort((a, b) => a.time - b.time),
    );
  const renameMarker = (id: string, label: string) =>
    setMarkers((items) =>
      items.map((item) => (item.id === id ? { ...item, label: label.slice(0, 60) } : item)),
    );
  const [snapMs, setSnapMs] = useState(0);
  const select = (point: Selection) => {
    setSelected(point);
    setSelection(point ? [point] : []);
  };
  const fit = (duration = Math.max(patternEnd(pattern), displayDurationMs)) =>
    setViewport({
      startMs: 0,
      durationMs: Math.min(MAX_PATTERN_MS, Math.max(MIN_VIEW_MS, Math.round(duration))),
    });
  const zoom = (factor: number) =>
    setViewport((view) => ({
      ...view,
      durationMs: Math.min(MAX_PATTERN_MS, Math.max(MIN_VIEW_MS, view.durationMs * factor)),
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
        id: randomUUID(),
        time: Math.max(
          0,
          Math.min(
            Math.max(patternEnd(pattern), editor?.durationMs ?? 0, displayDurationMs),
            Math.round(time),
          ),
        ),
        label: nextMarkerLabel(items),
      },
    ]);
  return {
    layer,
    setLayer,
    selected,
    setSelected: select,
    setPrimarySelection: setSelected,
    selection,
    clipboard,
    setClipboard,
    setSelection,
    multilayerSelection,
    setMultilayerSelection,
    settings,
    visibleLayers,
    toggleLayer,
    viewport,
    setViewport,
    cursor,
    setCursor,
    range,
    setRange,
    markers,
    setMarkers,
    moveMarker,
    renameMarker,
    snapMs,
    setSnapMs,
    fit,
    zoom,
    pan,
    addMarker,
  };
}
