import { frameRms } from "../signal/envelope";
import { fft, hann } from "../signal/fft";

const nextPowerOfTwo = (value: number) => 2 ** Math.ceil(Math.log2(Math.max(2, value)));

// Log-Gaussian-weighted modulation spectrum of the RMS envelope, relative to its mean level.
function modulationStrength(
  samples: Float32Array,
  sampleRate: number,
  envelopeHz: number,
  windowMs: number,
  hopMs: number,
  centerHz: number,
  width: number,
) {
  const envelopeHop = Math.max(1, Math.round(sampleRate / envelopeHz));
  const envelope = frameRms(samples, Math.max(envelopeHop, envelopeHop * 2), envelopeHop);
  const length = envelope.length;
  const window = Math.max(8, Math.round((windowMs / 1000) * envelopeHz));
  const size = nextPowerOfTwo(window);
  const hop = Math.max(1, Math.round((hopMs / 1000) * envelopeHz));
  const frames = Math.max(1, Math.floor((length - window) / hop) + 1);
  const stepMs = (hop / envelopeHz) * 1000;
  const binHz = envelopeHz / size;
  const half = size / 2;
  const weights = new Float32Array(half + 1);
  for (let bin = 1; bin <= half; bin += 1) {
    const hz = bin * binHz;
    weights[bin] = Math.exp(-(Math.log2(hz / centerHz) ** 2) / (2 * width * width));
  }
  const taper = hann(size);
  const real = new Float32Array(size);
  const imaginary = new Float32Array(size);
  const values = new Float32Array(frames);
  for (let frame = 0; frame < frames; frame += 1) {
    const start = frame * hop;
    let level = 0;
    for (let index = 0; index < window; index += 1) level += envelope[start + index] ?? 0;
    level /= window;
    for (let index = 0; index < size; index += 1) {
      const value = index < window ? (envelope[start + index] ?? 0) - level : 0;
      real[index] = value * taper[index];
      imaginary[index] = 0;
    }
    fft(real, imaginary);
    let strength = 0;
    for (let bin = 1; bin <= half; bin += 1)
      strength += Math.hypot(real[bin], imaginary[bin]) * weights[bin];
    values[frame] = level > 0 ? strength / (level * window) : 0;
  }
  return { stepMs, values };
}

export const roughnessSeries = (samples: Float32Array, sampleRate: number) =>
  modulationStrength(samples, sampleRate, 800, 185, 46, 70, 0.65);

export const fluctuationSeries = (samples: Float32Array, sampleRate: number) =>
  modulationStrength(samples, sampleRate, 200, 1500, 100, 4, 0.7);
