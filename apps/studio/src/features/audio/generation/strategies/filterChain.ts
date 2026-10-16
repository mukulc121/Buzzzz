import { filter, highPass, lowPass } from "../../signal/biquad";
import { hapticFrequency } from "../frequency";
import { empty } from "../model";
import type { IPulsarEvent, IStrategy } from "../model";
import { discreteEvents, flatCurve, intensityCurve } from "../shaping";

const ENVELOPE_HZ = 5;
const AGC_EPSILON = 0.01;
const CORING = 0.1;
const OUTPUT_GAIN = 1.5;

export const filterChain: IStrategy = {
  id: "aosp-transcode",
  name: "Filter-chain transcode (Android)",
  summary: "Puts the audio through Android's own audio→vibration filter chain.",
  detail:
    "A port of AOSP's HapticGenerator - what Android itself runs when an app generates haptics from an audio channel. It doesn't analyze anything: it band-limits, rectifies, extracts an envelope through a filter cascade, centers the energy on the actuator's 150Hz resonance, levels it with a continuous AGC (no gate to fall off), and shapes it with a cubic 'coring' distortion that fades small signals to nothing without clicking. The result feels like the sound rather than like a description of it. Its frequency channel is nearly flat - the real chain plays everything at the resonance.",
  params: [
    {
      id: "resonantHz",
      label: "Resonance",
      min: 80,
      max: 250,
      step: 5,
      defaultValue: 150,
      suffix: "Hz",
    },
    {
      id: "compression",
      label: "Compression",
      min: -1,
      max: -0.1,
      step: 0.05,
      defaultValue: -0.8,
      precision: 2,
    },
    { id: "drive", label: "Drive", min: 0.05, max: 1, step: 0.05, defaultValue: 0.3, precision: 2 },
  ],
  generate(clip, options, params) {
    const resonantHz = params?.resonantHz ?? 150;
    const compression = params?.compression ?? -0.8;
    const drive = params?.drive ?? 0.3;
    const { samples, sampleRate, durationMs } = clip;
    if (samples.length === 0) return empty();
    let band = filter(samples, highPass(50, sampleRate));
    band = filter(band, lowPass(Math.min(9000, sampleRate / 2 - 100), sampleRate));
    const rectified = new Float32Array(band.length);
    for (let index = 0; index < band.length; index += 1)
      rectified[index] = Math.max(band[index], 0);
    let envelope = filter(rectified, highPass(60, sampleRate));
    envelope = filter(envelope, lowPass(700, sampleRate));
    envelope = filter(envelope, lowPass(400, sampleRate));
    envelope = filter(envelope, lowPass(500, sampleRate));
    envelope = filter(envelope, highPass(resonantHz, sampleRate, 1));
    envelope = filter(envelope, lowPass(resonantHz, sampleRate, 1));
    const smoothing = Math.exp((-2 * Math.PI * ENVELOPE_HZ) / sampleRate);
    const leveled = new Float32Array(envelope.length);
    let level = 0;
    for (let index = 0; index < envelope.length; index += 1) {
      level = smoothing * level + (1 - smoothing) * Math.abs(envelope[index]);
      leveled[index] = envelope[index] * (level + AGC_EPSILON) ** compression;
    }
    const shaped = new Float32Array(leveled.length);
    for (let index = 0; index < leveled.length; index += 1) {
      const driven = drive * leveled[index];
      const cored = (driven * driven * driven) / (CORING + driven * driven);
      shaped[index] = (OUTPUT_GAIN * cored) / (1 + Math.abs(cored));
    }
    const output = filter(shaped, lowPass(300, sampleRate));
    const stepMs = 1000 / options.envelopeHz;
    const block = Math.max(1, Math.round((stepMs / 1000) * sampleRate));
    const count = Math.max(1, Math.ceil(output.length / block));
    const values = new Float32Array(count);
    let peak = 0;
    for (let index = 0; index < count; index += 1) {
      const start = index * block;
      const end = Math.min(output.length, start + block);
      let sum = 0;
      for (let sample = start; sample < end; sample += 1) sum += output[sample] * output[sample];
      const rms = end > start ? Math.sqrt(sum / (end - start)) : 0;
      values[index] = rms;
      if (rms > peak) peak = rms;
    }
    if (peak <= 0) return empty();
    for (let index = 0; index < count; index += 1) values[index] /= peak;
    const events: IPulsarEvent[] = [];
    let last = -Infinity;
    for (let index = 1; index < count; index += 1) {
      const time = index * stepMs;
      if (values[index] - values[index - 1] > 0.3 && time - last >= 50) {
        events.push({ time, intensity: values[index], frequency: hapticFrequency(resonantHz) });
        last = time;
      }
    }
    return {
      intensity: intensityCurve(values, stepMs, options),
      frequency: flatCurve(hapticFrequency(resonantHz), durationMs),
      discrete: discreteEvents(events, options),
    };
  },
};
