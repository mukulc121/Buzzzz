import { follow, frameRms } from "../signal/envelope";
import { bandEnergy, vibrotactileWeight, weightedEnergy } from "../signal/spectrum";
import { levelFrames, orderedRange, peakRelativeLevel, spectralFrames } from "./framing";
import type { IMetric } from "./model";
import { fluctuationSeries, roughnessSeries } from "./modulation";

const vibrotactile: IMetric = {
  id: "vibrotactile",
  label: "Vibrotactile loudness",
  description: "Loudness weighted by the SKIN’s sensitivity (~250Hz) - how much you’d feel it.",
  color: "rgba(180, 83, 9, 1)",
  scale: { full: 1 },
  params: [
    {
      id: "floorDb",
      label: "Floor",
      min: -80,
      max: -20,
      step: 5,
      defaultValue: -50,
      suffix: "dB",
      precision: 0,
    },
  ],
  compute(samples, sampleRate, frameMs, params) {
    const { spec, stepMs } = spectralFrames(samples, sampleRate, frameMs);
    return {
      stepMs,
      values: peakRelativeLevel(weightedEnergy(spec, vibrotactileWeight), params.floorDb),
    };
  },
};

const envelope: IMetric = {
  id: "envelope",
  label: "Envelope follower",
  description: "RMS shaped by an attack/release follower - the ADSR envelope of the sound.",
  color: "rgba(245, 158, 11, 1)",
  scale: { full: 1, level: true },
  params: [
    {
      id: "attackMs",
      label: "Attack",
      min: 0,
      max: 200,
      step: 1,
      defaultValue: 5,
      suffix: "ms",
      precision: 0,
    },
    {
      id: "releaseMs",
      label: "Release",
      min: 0,
      max: 600,
      step: 5,
      defaultValue: 80,
      suffix: "ms",
      precision: 0,
    },
  ],
  compute(samples, sampleRate, frameMs, params) {
    const { frameSize, hop, stepMs } = levelFrames(sampleRate, frameMs);
    const rms = frameRms(samples, frameSize, hop);
    return { stepMs, values: follow(rms, stepMs, params.attackMs, params.releaseMs) };
  },
};

const band: IMetric = {
  id: "band",
  label: "Band energy",
  description: "Energy inside a frequency band you choose - isolate bass, mids, or highs.",
  color: "rgba(22, 163, 74, 1)",
  scale: { level: true },
  params: [
    {
      id: "lowHz",
      label: "Low frequency",
      min: 0,
      max: 8000,
      step: 20,
      defaultValue: 20,
      suffix: "Hz",
      precision: 0,
    },
    {
      id: "highHz",
      label: "High frequency",
      min: 100,
      max: 16000,
      step: 50,
      defaultValue: 250,
      suffix: "Hz",
      precision: 0,
    },
  ],
  compute(samples, sampleRate, frameMs, params) {
    const { spec, stepMs } = spectralFrames(samples, sampleRate, frameMs);
    const { min, max } = orderedRange(params.lowHz, params.highHz, 0);
    return { stepMs, values: bandEnergy(spec, min, max) };
  },
};

const roughness: IMetric = {
  id: "roughness",
  label: "Roughness (asper)",
  description:
    "Fast amplitude modulation (~70Hz) - the “rough/gritty” texture. Maps 1:1 to haptics.",
  color: "rgba(194, 65, 12, 1)",
  scale: { full: 8, unit: "asper" },
  compute: (samples, sampleRate) => roughnessSeries(samples, sampleRate),
};

const fluctuation: IMetric = {
  id: "fluctuation",
  label: "Fluctuation strength (vacil)",
  description: "Slow amplitude modulation (~4Hz) - pulsing/wavering; the rhythm side of the axis.",
  color: "rgba(124, 58, 237, 1)",
  scale: { full: 8, unit: "vacil" },
  compute: (samples, sampleRate) => fluctuationSeries(samples, sampleRate),
};

export const INTENSITY_METRICS = [vibrotactile, envelope, band, roughness, fluctuation];
