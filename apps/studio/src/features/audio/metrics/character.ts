import { medianFilter } from "../signal/onset";
import type { ISpectrogram } from "../signal/spectrogram";
import { peakTonality } from "../signal/spectrum";
import { spectralFrames } from "./framing";
import type { IMetric } from "./model";

const MIN_SPAN = 3;

// Soft-mask HPSS: percussive share of each frame's power.
function percussiveShare(spectrum: ISpectrogram, timeSpan = 17, frequencySpan = 17) {
  const count = spectrum.frames.length;
  const bins = spectrum.bins;
  const share = new Float32Array(count);
  if (count === 0) return share;
  const harmonic = Array.from({ length: count }, () => new Float32Array(bins));
  const column = new Float32Array(count);
  for (let bin = 0; bin < bins; bin += 1) {
    for (let frame = 0; frame < count; frame += 1) column[frame] = spectrum.frames[frame][bin];
    const filtered = medianFilter(column, timeSpan);
    for (let frame = 0; frame < count; frame += 1) harmonic[frame][bin] = filtered[frame];
  }
  for (let frame = 0; frame < count; frame += 1) {
    const magnitudes = spectrum.frames[frame];
    const percussive = medianFilter(magnitudes, frequencySpan);
    const sustained = harmonic[frame];
    let percussivePower = 0;
    let total = 0;
    for (let bin = 0; bin < bins; bin += 1) {
      const power = magnitudes[bin] * magnitudes[bin];
      const p = percussive[bin] * percussive[bin];
      const h = sustained[bin] * sustained[bin];
      const mask = p + h;
      if (mask > 0) percussivePower += power * (p / mask);
      total += power;
    }
    share[frame] = total > 0 ? Math.min(1, percussivePower / total) : 0;
  }
  return share;
}

const hpss: IMetric = {
  id: "hpss",
  label: "Percussive share (HPSS)",
  description: "Fraction of energy that is percussive - sustain (0) vs. hits (1).",
  color: "rgba(154, 52, 18, 1)",
  scale: { full: 1 },
  params: [
    { id: "span", label: "Separation", min: 5, max: 41, step: 2, defaultValue: 17, precision: 0 },
  ],
  compute(samples, sampleRate, frameMs, params) {
    const { spec, stepMs } = spectralFrames(samples, sampleRate, frameMs);
    const span = Math.max(MIN_SPAN, Math.round(params.span) | 1);
    return { stepMs, values: percussiveShare(spec, span, span) };
  },
};

const tonality: IMetric = {
  id: "tonality",
  label: "Tonality",
  description: "How much a clear tone dominates over noise - whistle (high) vs. hiss (low).",
  color: "rgba(5, 150, 105, 1)",
  scale: { full: 1 },
  compute(samples, sampleRate, frameMs) {
    const { spec, stepMs } = spectralFrames(samples, sampleRate, frameMs);
    return { stepMs, values: peakTonality(spec) };
  },
};

export const CHARACTER_METRICS = [hpss, tonality];
