import type { ISpectrogram } from "./spectrogram";

// Magnitude-weighted mean frequency of each frame, in Hz.
export function spectralCentroid(spectrum: ISpectrogram) {
  const values = new Float32Array(spectrum.frames.length);
  for (let frame = 0; frame < spectrum.frames.length; frame += 1) {
    const bins = spectrum.frames[frame];
    let weighted = 0;
    let total = 0;
    for (let bin = 0; bin < spectrum.bins; bin += 1) {
      weighted += bin * spectrum.binHz * bins[bin];
      total += bins[bin];
    }
    values[frame] = total > 0 ? weighted / total : 0;
  }
  return values;
}

// Root of the summed power between two frequencies.
export function bandEnergy(spectrum: ISpectrogram, lowHz: number, highHz: number) {
  const from = Math.max(0, Math.floor(lowHz / spectrum.binHz));
  const to = Math.min(spectrum.bins, Math.ceil(highHz / spectrum.binHz));
  const values = new Float32Array(spectrum.frames.length);
  for (let frame = 0; frame < spectrum.frames.length; frame += 1) {
    const bins = spectrum.frames[frame];
    let sum = 0;
    for (let bin = from; bin < to; bin += 1) sum += bins[bin] * bins[bin];
    values[frame] = Math.sqrt(sum);
  }
  return values;
}

// Geometric over arithmetic mean of the magnitudes, excluding DC.
export function spectralFlatness(spectrum: ISpectrogram) {
  const values = new Float32Array(spectrum.frames.length);
  for (let frame = 0; frame < spectrum.frames.length; frame += 1) {
    const bins = spectrum.frames[frame];
    let logs = 0;
    let sum = 0;
    for (let bin = 1; bin < spectrum.bins; bin += 1) {
      const value = bins[bin] + 1e-10;
      logs += Math.log(value);
      sum += value;
    }
    const count = spectrum.bins - 1;
    const geometric = Math.exp(logs / count);
    const arithmetic = sum / count;
    values[frame] = arithmetic > 0 ? Math.min(1, geometric / arithmetic) : 0;
  }
  return values;
}

// Share of power in narrow spectral peaks.
export function peakTonality(spectrum: ISpectrogram) {
  const values = new Float32Array(spectrum.frames.length);
  for (let frame = 0; frame < spectrum.frames.length; frame += 1) {
    const bins = spectrum.frames[frame];
    let tonal = 0;
    let total = 0;
    for (let bin = 2; bin < spectrum.bins - 2; bin += 1) {
      const value = bins[bin];
      total += value * value;
      if (
        value > bins[bin - 1] &&
        value > bins[bin + 1] &&
        value > bins[bin - 2] &&
        value > bins[bin + 2]
      ) {
        const neighbours = (bins[bin - 2] + bins[bin - 1] + bins[bin + 1] + bins[bin + 2]) / 4;
        if (value > neighbours * 2) tonal += value * value;
      }
    }
    values[frame] = total > 0 ? Math.min(1, tonal / total) : 0;
  }
  return values;
}

// IEC 61672 A-weighting, in dB.
export function aWeightingDb(hz: number) {
  const squared = hz * hz;
  const numerator = 12194 ** 2 * squared * squared;
  const denominator =
    (squared + 20.6 ** 2) *
    Math.sqrt((squared + 107.7 ** 2) * (squared + 737.9 ** 2)) *
    (squared + 12194 ** 2);
  return denominator === 0 ? -Infinity : 20 * Math.log10(numerator / denominator) + 2;
}

// Skin sensitivity: a log-Gaussian centred on 250 Hz.
export function vibrotactileWeight(hz: number) {
  if (hz <= 0) return 0;
  const octaves = Math.log2(hz / 250);
  return Math.exp(-(octaves * octaves) / (2 * 1.6 * 1.6));
}

export function weightedEnergy(spectrum: ISpectrogram, weight: (hz: number) => number) {
  const weights = new Float32Array(spectrum.bins);
  for (let bin = 0; bin < spectrum.bins; bin += 1) weights[bin] = weight(bin * spectrum.binHz);
  const values = new Float32Array(spectrum.frames.length);
  for (let frame = 0; frame < spectrum.frames.length; frame += 1) {
    const bins = spectrum.frames[frame];
    let sum = 0;
    for (let bin = 0; bin < spectrum.bins; bin += 1) {
      const value = bins[bin] * weights[bin];
      sum += value * value;
    }
    values[frame] = Math.sqrt(sum);
  }
  return values;
}
