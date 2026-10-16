import { levelAboveFloor } from "../signal/envelope";
import { spectrogram } from "../signal/spectrogram";

// Power-of-two FFT nearest the analysis frame, half-overlapped.
export function spectralFrames(samples: Float32Array, sampleRate: number, frameMs: number) {
  const wanted = (frameMs / 1000) * sampleRate;
  const rounded = 2 ** Math.round(Math.log2(Math.max(1, wanted)));
  const fftSize = Math.min(8192, Math.max(256, rounded));
  const hop = Math.max(1, fftSize >> 1);
  const stepMs = (hop / sampleRate) * 1000;
  return { spec: spectrogram(samples, sampleRate, fftSize, hop), stepMs, fftSize, hop };
}

export function levelFrames(sampleRate: number, frameMs: number, minimum = 1) {
  const frameSize = Math.max(minimum, Math.round((frameMs / 1000) * sampleRate));
  const hop = Math.max(1, frameSize >> 1);
  return { frameSize, hop, stepMs: (hop / sampleRate) * 1000 };
}

// Keeps a low/high pair ordered and at least 1 apart.
export function orderedRange(low: number, high: number, minimum: number) {
  const min = Math.max(minimum, Math.min(low, high - 1));
  return { min, max: Math.max(min + 1, high) };
}

export function peakRelativeLevel(values: Float32Array, floorDb: number) {
  let peak = 0;
  for (const value of values) if (value > peak) peak = value;
  const output = new Float32Array(values.length);
  if (peak > 0)
    for (let index = 0; index < values.length; index += 1)
      output[index] = levelAboveFloor(values[index] / peak, floorDb);
  return output;
}
