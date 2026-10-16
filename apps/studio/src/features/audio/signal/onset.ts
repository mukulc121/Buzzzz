import { fft, hann } from "./fft";
import type { ISpectrogram } from "./spectrogram";

const PEAK_PICKING = { medianWindow: 17, factor: 1.6, delta: 0.07, minGapMs: 50 };
const PEAKED_RATIO = 8;
const WARMUP_FRAMES = 2;

// Complex-domain onset novelty: distance from the phase-predicted spectrum.
export function complexNovelty(samples: Float32Array, size: number, hop: number) {
  const bins = size / 2 + 1;
  const window = hann(size);
  const real = new Float32Array(size);
  const imaginary = new Float32Array(size);
  const magnitude = new Float32Array(bins);
  const phase = new Float32Array(bins);
  const previousMagnitude = new Float32Array(bins);
  const previousPhase = new Float32Array(bins);
  const olderPhase = new Float32Array(bins);
  const frames = Math.max(0, Math.floor((samples.length - size) / hop) + 1);
  const novelty = new Float32Array(frames);
  for (let frame = 0; frame < frames; frame += 1) {
    const start = frame * hop;
    for (let index = 0; index < size; index += 1) {
      real[index] = samples[start + index] * window[index];
      imaginary[index] = 0;
    }
    fft(real, imaginary);
    for (let bin = 0; bin < bins; bin += 1) {
      magnitude[bin] = Math.sqrt(real[bin] * real[bin] + imaginary[bin] * imaginary[bin]);
      phase[bin] = Math.atan2(imaginary[bin], real[bin]);
    }
    if (frame >= WARMUP_FRAMES) {
      let sum = 0;
      for (let bin = 0; bin < bins; bin += 1) {
        const predicted = 2 * previousPhase[bin] - olderPhase[bin];
        const re =
          magnitude[bin] * Math.cos(phase[bin]) - previousMagnitude[bin] * Math.cos(predicted);
        const im =
          magnitude[bin] * Math.sin(phase[bin]) - previousMagnitude[bin] * Math.sin(predicted);
        sum += Math.sqrt(re * re + im * im);
      }
      novelty[frame] = sum;
    }
    olderPhase.set(previousPhase);
    previousPhase.set(phase);
    previousMagnitude.set(magnitude);
  }
  return novelty;
}

// High-frequency-content onset function.
export function highFrequencyContent(spectrum: ISpectrogram) {
  const values = new Float32Array(spectrum.frames.length);
  for (let frame = 0; frame < spectrum.frames.length; frame += 1) {
    const bins = spectrum.frames[frame];
    let sum = 0;
    for (let bin = 0; bin < spectrum.bins; bin += 1) sum += bin * bins[bin] * bins[bin];
    values[frame] = Math.sqrt(sum);
  }
  return values;
}

// True when the novelty has real peaks rather than a flat or noisy floor.
export function isPeaked(values: Float32Array) {
  if (values.length === 0) return false;
  const sorted = Array.from(values).sort((left, right) => left - right);
  const median = sorted[sorted.length >> 1];
  const peak = sorted[sorted.length - 1];
  return peak <= 0 ? false : median <= 0 ? true : peak / median >= PEAKED_RATIO;
}

export function pickPeaks(values: Float32Array, hopMs: number, settings = PEAK_PICKING) {
  const count = values.length;
  if (count === 0) return [];
  if (!isPeaked(values)) return [];
  let peak = 0;
  for (const value of values) if (value > peak) peak = value;
  if (peak <= 0) return [];
  const normalized = new Float32Array(count);
  for (let index = 0; index < count; index += 1) normalized[index] = values[index] / peak;
  const radius = Math.floor(settings.medianWindow / 2);
  const gap = Math.max(1, Math.round(settings.minGapMs / hopMs));
  const peaks: { frame: number; strength: number }[] = [];
  let last = -Infinity;
  const window: number[] = [];
  for (let index = 0; index < count; index += 1) {
    const from = Math.max(0, index - radius);
    const to = Math.min(count, index + radius + 1);
    window.length = 0;
    for (let item = from; item < to; item += 1) window.push(normalized[item]);
    window.sort((left, right) => left - right);
    const threshold = window[window.length >> 1] * settings.factor + settings.delta;
    if (
      normalized[index] >= normalized[index - 1 < 0 ? 0 : index - 1] &&
      normalized[index] >= normalized[Math.min(count - 1, index + 1)] &&
      normalized[index] > threshold &&
      index - last >= gap
    ) {
      peaks.push({ frame: index, strength: normalized[index] });
      last = index;
    }
  }
  return peaks;
}

export function medianFilter(values: Float32Array, size: number) {
  const output = new Float32Array(values.length);
  const radius = Math.floor(size / 2);
  const window: number[] = [];
  for (let index = 0; index < values.length; index += 1) {
    window.length = 0;
    for (
      let item = Math.max(0, index - radius);
      item < Math.min(values.length, index + radius + 1);
      item += 1
    )
      window.push(values[item]);
    window.sort((left, right) => left - right);
    output[index] = window[window.length >> 1];
  }
  return output;
}
