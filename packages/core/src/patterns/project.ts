import { isPattern, isRecord, MAX_PATTERN_MS, type Pattern } from "./pattern.ts";
import { isRiveConfig, type IRiveConfig } from "../rive/config.ts";
export interface IPresetEditor {
  markers: { id: string; time: number; label: string }[];
  range: { start: number; end: number } | null;
  durationMs?: number;
}
export type Preset = { id: string; name: string; pattern: Pattern; editor?: IPresetEditor };
export type Project = {
  presets: Preset[];
  map: Record<string, string>;
  riveStateMachine?: string;
  riveConfig?: IRiveConfig;
};
function validEditor(value: unknown) {
  if (!isRecord(value) || !Array.isArray(value.markers) || value.markers.length > 512) return false;
  const time = (value: unknown): value is number =>
    typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= MAX_PATTERN_MS;
  if (value.durationMs !== undefined && !time(value.durationMs)) return false;
  if (
    value.range !== null &&
    (!isRecord(value.range) ||
      !time(value.range.start) ||
      !time(value.range.end) ||
      value.range.end <= value.range.start)
  )
    return false;
  const ids = new Set<string>();
  return value.markers.every((marker) => {
    if (
      !isRecord(marker) ||
      typeof marker.id !== "string" ||
      !marker.id ||
      marker.id.length > 512 ||
      ids.has(marker.id) ||
      typeof marker.label !== "string" ||
      marker.label.length > 512 ||
      !time(marker.time)
    )
      return false;
    ids.add(marker.id);
    return true;
  });
}
export function isProject(value: unknown): value is Project {
  if (
    !isRecord(value) ||
    !Array.isArray(value.presets) ||
    value.presets.length === 0 ||
    value.presets.length > 1000 ||
    !isRecord(value.map)
  )
    return false;
  if (
    value.riveStateMachine !== undefined &&
    (typeof value.riveStateMachine !== "string" || value.riveStateMachine.length > 512)
  )
    return false;
  if (value.riveConfig !== undefined && !isRiveConfig(value.riveConfig)) return false;
  const ids = new Set<string>();
  for (const preset of value.presets) {
    if (
      !isRecord(preset) ||
      typeof preset.id !== "string" ||
      !preset.id ||
      ids.has(preset.id) ||
      typeof preset.name !== "string" ||
      preset.name.length > 512 ||
      !isPattern(preset.pattern) ||
      (preset.editor !== undefined && !validEditor(preset.editor))
    )
      return false;
    ids.add(preset.id);
  }
  return Object.entries(value.map).every(
    ([name, id]) => name.length <= 512 && typeof id === "string" && ids.has(id),
  );
}
