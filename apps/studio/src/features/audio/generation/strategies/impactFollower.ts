import { hapticFrequency } from "../frequency";
import { empty } from "../model";
import type { IPulsarEvent, IStrategy } from "../model";
import { discreteEvents, flatCurve, frequencyCurve, intensityCurve } from "../shaping";

const ZCR_FRAME_MS = 20;
const ZCR_MIN_HZ = 200;
const ZCR_MAX_HZ = 6000;
const ZCR_SILENCE = 1e-7;
const MIN_GAP_MS = 50;

// Zero-crossing rate per 20 ms block, squeezed onto the haptic band.
function zeroCrossingFrequency(samples: Float32Array, sampleRate: number) {
  const block = Math.max(2, Math.round((ZCR_FRAME_MS / 1000) * sampleRate));
  const count = Math.max(1, Math.ceil(samples.length / block));
  const low = Math.log2(ZCR_MIN_HZ);
  const high = Math.log2(ZCR_MAX_HZ);
  const values = new Float32Array(count);
  let current = 0.5;
  for (let index = 0; index < count; index += 1) {
    const start = index * block;
    const end = Math.min(samples.length, start + block);
    let crossings = 0;
    let energy = 0;
    for (let sample = start; sample < end; sample += 1) {
      energy += samples[sample] * samples[sample];
      if (sample > start && samples[sample] >= 0 !== samples[sample - 1] >= 0) crossings += 1;
    }
    const length = end - start;
    if (length > 1 && energy / length > ZCR_SILENCE) {
      const hz = (crossings / (length - 1)) * sampleRate;
      const clamped = Math.min(Math.max(hz, ZCR_MIN_HZ), ZCR_MAX_HZ);
      const position = (Math.log2(clamped) - low) / (high - low);
      current = hapticFrequency(60 + position * (300 - 60));
    }
    values[index] = current;
  }
  return values;
}

export const impactFollower: IStrategy = {
  id: "impact-follower",
  name: "Impact follower",
  summary: "Instant attack and slow release, straight off the waveform.",
  detail:
    "Rectifies the waveform and tracks it with a one-pole follower that charges fast and discharges slowly, the way a diode-and-capacitor envelope detector does. Because it runs sample by sample rather than over frames, a hit sets the level the instant it lands instead of being averaged away. Pitch follows the zero-crossing rate - how often the waveform changes sign, high for noise and consonants, low for bass - so the whole strategy needs no FFT and is the cheapest here. Best on impacts, clicks and UI sounds; it saturates on dense music.",
  params: [
    {
      id: "attackMs",
      label: "Attack",
      min: 0.5,
      max: 20,
      step: 0.5,
      defaultValue: 2,
      suffix: "ms",
      precision: 1,
    },
    {
      id: "releaseMs",
      label: "Release",
      min: 20,
      max: 300,
      step: 5,
      defaultValue: 120,
      suffix: "ms",
    },
    {
      id: "transientThreshold",
      label: "Transient sensitivity",
      min: 0.05,
      max: 0.6,
      step: 0.01,
      defaultValue: 0.25,
      precision: 2,
    },
  ],
  generate(clip, options, params) {
    const attackMs = params?.attackMs ?? 2;
    const releaseMs = params?.releaseMs ?? 120;
    const threshold = params?.transientThreshold ?? 0.25;
    const { samples, sampleRate, durationMs } = clip;
    if (samples.length === 0) return empty();
    const attack = Math.exp(-1 / Math.max(1, (attackMs / 1000) * sampleRate));
    const release = Math.exp(-1 / Math.max(1, (releaseMs / 1000) * sampleRate));
    const followed = new Float32Array(samples.length);
    let level = 0;
    for (let index = 0; index < samples.length; index += 1) {
      const value = Math.abs(samples[index]);
      const coefficient = value > level ? attack : release;
      level = coefficient * level + (1 - coefficient) * value;
      followed[index] = level;
    }
    const stepMs = 1000 / options.envelopeHz;
    const block = Math.max(1, Math.round((stepMs / 1000) * sampleRate));
    const count = Math.max(1, Math.ceil(followed.length / block));
    const values = new Float32Array(count);
    let peak = 0;
    for (let index = 0; index < count; index += 1) {
      const start = index * block;
      const end = Math.min(followed.length, start + block);
      let sum = 0;
      for (let sample = start; sample < end; sample += 1) sum += followed[sample];
      const average = end > start ? sum / (end - start) : 0;
      values[index] = average;
      if (average > peak) peak = average;
    }
    if (peak <= 0) return { intensity: [], frequency: flatCurve(0.5, durationMs), discrete: [] };
    for (let index = 0; index < count; index += 1) values[index] /= peak;
    const pitch = zeroCrossingFrequency(samples, sampleRate);
    const pitchAt = (timeMs: number) =>
      pitch[Math.min(pitch.length - 1, Math.floor(timeMs / ZCR_FRAME_MS))] ?? 0.5;
    const events: IPulsarEvent[] = [];
    let last = -Infinity;
    for (let index = 1; index < count; index += 1) {
      const rise = values[index] - values[index - 1];
      const time = index * stepMs;
      if (rise > threshold && time - last >= MIN_GAP_MS) {
        events.push({ time, intensity: Math.min(1, values[index]), frequency: pitchAt(time) });
        last = time;
      }
    }
    return {
      intensity: intensityCurve(values, stepMs, options),
      frequency: frequencyCurve(pitch, ZCR_FRAME_MS, durationMs, options),
      discrete: discreteEvents(events, options),
    };
  },
};
