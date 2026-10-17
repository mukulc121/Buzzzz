import type { Pattern } from "@buzzzz/core";
import type { IPlaybackRange } from "./model";
import { playbackStart } from "./playbackStart";
import { derivePlaybackOutputs } from "./playbackOutputs";

interface IPlaybackLabel {
  name: string;
  pattern: Pattern;
  playing: boolean;
  durationMs: number;
  range: IPlaybackRange | null;
  cursor: number;
  phones: number;
  onPhone: boolean;
  sound: boolean;
  audio: boolean;
  animation: boolean;
}

export function derivePlaybackLabel(options: IPlaybackLabel) {
  const { name, pattern, playing, durationMs, range, cursor, audio, animation } = options;
  const outputs = derivePlaybackOutputs({ ...options, mode: "document" });
  if (playing) return { label: "Stop (P)", devices: outputs.devices };
  const layers = pattern.continuousPattern;
  const amplitude = layers.amplitude.length > 0;
  const frequency = layers.frequency.length > 0;
  const gap =
    amplitude === frequency
      ? null
      : `the ${amplitude ? "Frequency" : "Intensity"} layer is empty, so the ${amplitude ? "Intensity" : "Frequency"} curve can't play`;
  if (gap && !audio && !animation && pattern.discretePattern.length === 0)
    return { label: `Nothing to play - ${gap} · P`, devices: outputs.devices };
  const destinations = [];
  if (outputs.devices)
    destinations.push(`${outputs.devices} ${outputs.devices === 1 ? "device" : "devices"}`);
  if (audio) destinations.push("audio");
  if (animation) destinations.push("animation");
  if (outputs.sound) destinations.push("sound");
  const { start, end } = range ?? { start: 0, end: durationMs };
  const from = playbackStart({ start, end }, cursor);
  const clipped = from > 0 || end < durationMs;
  const label = destinations.length
    ? `Play “${name}” - ${destinations.join(", ")}${clipped ? ` (${from}-${end} ms)` : ""}${gap ? ` · ${gap}` : ""} · P`
    : outputs.opensDevicePanel
      ? "Connect a phone to play on device"
      : "Nothing to play - check the Preview switches";
  return { label, devices: outputs.devices };
}
