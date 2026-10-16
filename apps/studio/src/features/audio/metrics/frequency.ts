import { spectralCentroid } from "../signal/spectrum";
import type { ISpectrogram } from "../signal/spectrogram";
import { orderedRange, spectralFrames } from "./framing";
import type { IMetric } from "./model";

const BARK_BANDS = 24;
const UNVOICED_CENTROID = 0.5;

const bark = (hz: number) => 13 * Math.atan(0.00076 * hz) + 3.5 * Math.atan((hz / 7500) ** 2);

// Zwicker-style sharpness: Bark-weighted centroid of specific loudness, in acum.
function sharpnessAcum(spectrum: ISpectrogram, exponent = 0.23) {
  const bandOf = new Int32Array(spectrum.bins);
  for (let bin = 0; bin < spectrum.bins; bin += 1)
    bandOf[bin] = Math.min(BARK_BANDS - 1, Math.max(0, Math.floor(bark(bin * spectrum.binHz))));
  const bands = new Float64Array(BARK_BANDS);
  const values = new Float32Array(spectrum.frames.length);
  for (let frame = 0; frame < spectrum.frames.length; frame += 1) {
    const bins = spectrum.frames[frame];
    bands.fill(0);
    for (let bin = 0; bin < bandOf.length; bin += 1) bands[bandOf[bin]] += bins[bin] * bins[bin];
    let weighted = 0;
    let total = 0;
    for (let band = 0; band < BARK_BANDS; band += 1) {
      const loudness = bands[band] > 0 ? bands[band] ** exponent : 0;
      const z = band + 0.5;
      const weight = z <= 16 ? 1 : 0.066 * Math.exp(0.171 * z);
      weighted += loudness * weight * z;
      total += loudness;
    }
    values[frame] = total > 0 ? 0.11 * (weighted / total) : 0;
  }
  return values;
}

const sharpness: IMetric = {
  id: "sharpness",
  label: "Sharpness (acum)",
  description: "Perceptual sharpness - Bark centroid of specific loudness (level-independent).",
  color: "rgba(234, 179, 8, 1)",
  scale: { full: 4, unit: "acum" },
  compute(samples, sampleRate, frameMs) {
    const { spec, stepMs } = spectralFrames(samples, sampleRate, frameMs);
    return { stepMs, values: sharpnessAcum(spec) };
  },
};

const centroid: IMetric = {
  id: "centroid",
  label: "Spectral centroid",
  description: "Spectral center of mass - brightness, low (dull) to high (bright).",
  color: "rgba(13, 148, 136, 1)",
  scale: { full: 1 },
  params: [
    {
      id: "minHz",
      label: "Min frequency",
      min: 20,
      max: 2000,
      step: 20,
      defaultValue: 200,
      suffix: "Hz",
      precision: 0,
    },
    {
      id: "maxHz",
      label: "Max frequency",
      min: 1000,
      max: 12000,
      step: 100,
      defaultValue: 4000,
      suffix: "Hz",
      precision: 0,
    },
  ],
  compute(samples, sampleRate, frameMs, params) {
    const { spec, stepMs } = spectralFrames(samples, sampleRate, frameMs);
    const hz = spectralCentroid(spec);
    const { min, max } = orderedRange(params.minHz, params.maxHz, 1);
    const low = Math.log2(min);
    const high = Math.log2(max);
    const values = new Float32Array(hz.length);
    let current = UNVOICED_CENTROID;
    for (let frame = 0; frame < hz.length; frame += 1) {
      if (hz[frame] > 0) {
        const clamped = Math.min(max, Math.max(min, hz[frame]));
        current = (Math.log2(clamped) - low) / (high - low);
      }
      values[frame] = current;
    }
    return { stepMs, values };
  },
};

export const FREQUENCY_METRICS = [sharpness, centroid];
