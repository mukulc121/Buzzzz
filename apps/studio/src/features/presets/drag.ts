import { isPattern, isRecord, type Pattern } from "@buzzzz/core";
import type { StudioPreset } from "./catalog";

export const PRESET_DRAG_TYPE = "application/x-buzzzz-library-preset";

export function writePresetDrag(transfer: DataTransfer, entry: StudioPreset) {
  transfer.setData(PRESET_DRAG_TYPE, JSON.stringify({ name: entry.name, pattern: entry.pattern }));
  transfer.effectAllowed = "copy";
}

export function readPresetDrag(transfer: DataTransfer): Pattern | null {
  try {
    const value: unknown = JSON.parse(transfer.getData(PRESET_DRAG_TYPE));
    return isRecord(value) && isPattern(value.pattern) ? value.pattern : null;
  } catch {
    return null;
  }
}
