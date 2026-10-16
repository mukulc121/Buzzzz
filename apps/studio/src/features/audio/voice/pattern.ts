import { follow, levelAboveFloor, normalizePeak, resampleSeries } from "../signal/envelope";
import { DEFAULT_GENERATION } from "../generation/options";
import {
  discreteEvents,
  duckUnderEvents,
  frequencyCurve,
  intensityCurve,
} from "../generation/shaping";
import type { IPulsarEvent } from "../generation/model";
import type { IVoiceSignal } from "./analysis";

export interface IVoiceOptions {
  frequency: "pitch" | "brightness";
  releaseMs: number;
  floorDb: number;
  contrast: number;
  accents: boolean;
}

export const DEFAULT_VOICE: IVoiceOptions = {
  frequency: "pitch",
  releaseMs: 90,
  floorDb: -45,
  contrast: 0.3,
  accents: true,
};

const ATTACK_MS = 5;
const ACCENT_WINDOW_MS = 40;

function peakAfter(values: Float32Array, stepMs: number, timeMs: number, windowMs: number) {
  const from = Math.max(0, Math.round(timeMs / stepMs));
  const to = Math.min(values.length - 1, Math.round((timeMs + windowMs) / stepMs));
  let peak = 0;
  for (let index = from; index <= to; index += 1) if (values[index] > peak) peak = values[index];
  return Math.min(1, peak);
}

function valueAt(values: Float32Array, stepMs: number, timeMs: number) {
  if (values.length === 0) return 0.5;
  const position = timeMs / stepMs;
  const left = Math.min(values.length - 1, Math.max(0, Math.floor(position)));
  const right = Math.min(values.length - 1, left + 1);
  const fraction = position - left;
  return values[left] * (1 - fraction) + values[right] * fraction;
}

export function voiceToPulsar(signal: IVoiceSignal, voice: IVoiceOptions = DEFAULT_VOICE) {
  const options = { ...DEFAULT_GENERATION, contrast: voice.contrast };
  const level = new Float32Array(signal.linearRms.length);
  for (let index = 0; index < level.length; index += 1)
    level[index] = levelAboveFloor(signal.linearRms[index], voice.floorDb);
  const normalized = normalizePeak(level);
  const envelope = resampleSeries(
    follow(normalized, signal.rmsFrameMs, ATTACK_MS, voice.releaseMs),
    signal.rmsFrameMs,
    signal.durationMs,
    options.envelopeHz,
  );
  const source =
    voice.frequency === "pitch"
      ? { values: signal.pitchAsHapticFrequency, frameMs: signal.pitchFrameMs }
      : { values: signal.brightnessAsHapticFrequency, frameMs: signal.brightnessFrameMs };
  const accents: IPulsarEvent[] = voice.accents
    ? signal.attacks.map((attack) => ({
        time: attack.timeMs,
        intensity: peakAfter(normalized, signal.rmsFrameMs, attack.timeMs, ACCENT_WINDOW_MS),
        frequency: valueAt(source.values, source.frameMs, attack.timeMs),
      }))
    : [];
  duckUnderEvents(envelope.values, envelope.stepMs, accents, options.transientDuck);
  return {
    intensity: intensityCurve(envelope.values, envelope.stepMs, options),
    frequency: frequencyCurve(source.values, source.frameMs, signal.durationMs, options),
    discrete: discreteEvents(accents, options),
  };
}
