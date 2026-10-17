import { fft, hann } from "./fft";

export interface ISpectrogram {
  frames: Float32Array[];
  bins: number;
  binHz: number;
  hopMs: number;
  frameTimeMs: (frame: number) => number;
}

export function spectrogram(
  samples: Float32Array,
  sampleRate: number,
  size = 1024,
  hop = size / 4,
): ISpectrogram {
  const window = hann(size);
  const frames: Float32Array[] = [];
  const real = new Float32Array(size);
  const imaginary = new Float32Array(size);
  for (let start = 0; start + size <= samples.length; start += hop) {
    for (let index = 0; index < size; index += 1) {
      real[index] = samples[start + index] * window[index];
      imaginary[index] = 0;
    }
    fft(real, imaginary);
    const bins = size / 2 + 1;
    const magnitude = new Float32Array(bins);
    for (let bin = 0; bin < bins; bin += 1) magnitude[bin] = Math.hypot(real[bin], imaginary[bin]);
    frames.push(magnitude);
  }
  const hopMs = (hop / sampleRate) * 1000;
  const centerMs = (size / 2 / sampleRate) * 1000;
  return {
    frames,
    bins: size / 2 + 1,
    binHz: sampleRate / size,
    hopMs,
    frameTimeMs: (frame) => frame * hopMs + centerMs,
  };
}
