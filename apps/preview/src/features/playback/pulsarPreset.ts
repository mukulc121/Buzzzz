import type { IRiveConfig } from "@buzzzz/core";
import { Presets } from "react-native-pulsar";

type TPresetName = Exclude<keyof typeof Presets, "System">;

const presetKey = (name: string) => `${name[0].toLowerCase()}${name.slice(1)}`;

const isPresetKey = (key: string): key is TPresetName =>
  key !== "System" && typeof (Presets as Record<string, unknown>)[key] === "function";

/** Plays a stock Pulsar preset by its native name, e.g. "EngineRev" -> Presets.engineRev(). */
export function playPulsarPreset(name: string) {
  const key = presetKey(name);
  if (isPresetKey(key)) Presets[key]();
}

/** Stock presets a config plays untuned, to warm before the scene starts. */
export function pulsarPresetNames(haptics: IRiveConfig["haptics"]) {
  const names = new Set<string>();
  for (const action of Object.values(haptics ?? {}))
    if (action.kind === "sequence")
      for (const cue of action.cues) if ("pulsar" in cue && !cue.tuning) names.add(cue.pulsar);
  return [...names];
}
