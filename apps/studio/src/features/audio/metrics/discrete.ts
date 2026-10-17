import { follow, frameRms } from "../signal/envelope";
import { complexNovelty, isPeaked } from "../signal/onset";
import { levelFrames, orderedRange, spectralFrames } from "./framing";
import type { IMetric } from "./model";

const SILENT_DB = -100;
const decibels = (value: number) => (value > 1e-5 ? 20 * Math.log10(value) : SILENT_DB);

// Autocorrelated tempo laid out as a decaying pulse on each beat.
function beatPulse(novelty: Float32Array, stepMs: number, minBpm: number, maxBpm: number) {
  const length = novelty.length;
  const pulse = new Float32Array(length);
  if (length < 8 || !isPeaked(novelty)) return pulse;
  const minLag = Math.max(1, Math.round(60000 / maxBpm / stepMs));
  const maxLag = Math.min(length - 1, Math.round(60000 / minBpm / stepMs));
  if (maxLag <= minLag) return pulse;
  let period = minLag;
  let best = -Infinity;
  for (let lag = minLag; lag <= maxLag; lag += 1) {
    let sum = 0;
    for (let index = lag; index < length; index += 1) sum += novelty[index] * novelty[index - lag];
    if (sum > best) {
      best = sum;
      period = lag;
    }
  }
  let phase = 0;
  let strongest = -Infinity;
  for (let offset = 0; offset < period; offset += 1) {
    let sum = 0;
    for (let index = offset; index < length; index += period) sum += novelty[index];
    if (sum > strongest) {
      strongest = sum;
      phase = offset;
    }
  }
  const decay = Math.max(1, period * 0.25);
  for (let beat = phase; beat < length; beat += period)
    for (let offset = 0; offset < period && beat + offset < length; offset += 1) {
      const value = Math.exp(-offset / decay);
      if (value > pulse[beat + offset]) pulse[beat + offset] = value;
    }
  return pulse;
}

const transient: IMetric = {
  id: "transient",
  label: "Transient sharpness",
  description: "Attack slope - how abruptly loudness rises; spikes on sharp onsets.",
  color: "rgba(190, 24, 93, 1)",
  scale: { full: 24, unit: "dB" },
  compute(samples, sampleRate, frameMs) {
    const { frameSize, hop, stepMs } = levelFrames(sampleRate, frameMs);
    const rms = frameRms(samples, frameSize, hop);
    const values = new Float32Array(rms.length);
    let previous = SILENT_DB;
    for (let frame = 0; frame < rms.length; frame += 1) {
      const db = decibels(rms[frame]);
      values[frame] = Math.max(0, db - previous);
      previous = db;
    }
    return { stepMs, values };
  },
};

const novelty: IMetric = {
  id: "novelty",
  label: "Onset novelty",
  description:
    "How far each frame departs from what the two before it predict - spikes on onsets, flat on steady sound.",
  color: "rgba(239, 68, 68, 1)",
  scale: { level: true },
  params: [
    {
      id: "smoothingMs",
      label: "Smoothing",
      min: 0,
      max: 300,
      step: 5,
      defaultValue: 0,
      suffix: "ms",
      precision: 0,
    },
  ],
  compute(samples, sampleRate, frameMs, params) {
    const { stepMs, fftSize, hop } = spectralFrames(samples, sampleRate, frameMs);
    const values = complexNovelty(samples, fftSize, hop);
    return params.smoothingMs <= 0
      ? { stepMs, values }
      : { stepMs, values: follow(values, stepMs, 0, params.smoothingMs) };
  },
};

const beat: IMetric = {
  id: "beat",
  label: "Tempo / beat",
  description: "Estimated beat grid - a pulse on each beat at the detected tempo.",
  color: "rgba(77, 124, 15, 1)",
  scale: { full: 1 },
  params: [
    {
      id: "minBpm",
      label: "Min tempo",
      min: 40,
      max: 160,
      step: 5,
      defaultValue: 60,
      suffix: "BPM",
      precision: 0,
    },
    {
      id: "maxBpm",
      label: "Max tempo",
      min: 120,
      max: 300,
      step: 5,
      defaultValue: 190,
      suffix: "BPM",
      precision: 0,
    },
  ],
  compute(samples, sampleRate, frameMs, params) {
    const { stepMs, fftSize, hop } = spectralFrames(samples, sampleRate, frameMs);
    const { min, max } = orderedRange(params.minBpm, params.maxBpm, 20);
    return { stepMs, values: beatPulse(complexNovelty(samples, fftSize, hop), stepMs, min, max) };
  },
};

export const DISCRETE_METRICS = [transient, novelty, beat];
