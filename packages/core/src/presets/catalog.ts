import data from "./pulsar-presets.json";
import { isPattern } from "../patterns/pattern.ts";
export const pulsarPresets = data
  .filter((preset) => isPattern(preset.pattern))
  .map((preset) => ({ ...preset, tags: [...new Set(preset.tags)] }));
