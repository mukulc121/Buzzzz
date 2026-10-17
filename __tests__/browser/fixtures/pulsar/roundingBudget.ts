import type { Pattern } from "@buzzzz/core";

// Longest Pulsar tap voice: 5ms attack + 18ms release.
const TAP_VOICE_MS = 23;
const ulp = (magnitude: number) =>
  2 ** (Math.floor(Math.log2(Math.max(magnitude, 2 ** -126))) - 23);

const gains = new Map<number, { response: number; poles: number }>();

// L1 gains of Pulsar's 700 Hz, Q 5 lowpass from Web Audio spec coefficients: full response and poles.
export function lowpassGains(sampleRate: number) {
  const cached = gains.get(sampleRate);
  if (cached) return cached;
  const w = (2 * Math.PI * 700) / sampleRate;
  const alpha = Math.sin(w) / (2 * 10 ** (5 / 20));
  const a0 = 1 + alpha;
  const b = [(1 - Math.cos(w)) / 2 / a0, (1 - Math.cos(w)) / a0, (1 - Math.cos(w)) / 2 / a0];
  const [a1, a2] = [(-2 * Math.cos(w)) / a0, (1 - alpha) / a0];
  const l1 = ([b0, b1, b2]: number[]) => {
    let [x1, x2, y1, y2, total] = [0, 0, 0, 0, 0];
    for (let n = 0; n < 2 * sampleRate; n++) {
      const x = n ? 0 : 1;
      const y = b0! * x + b1! * x1 + b2! * x2 - a1 * y1 - a2 * y2;
      [x2, x1, y2, y1] = [x1, x, y1, y];
      total += Math.abs(y);
    }
    return total;
  };
  const result = { response: l1(b), poles: l1([1, 0, 0]) };
  gains.set(sampleRate, result);
  return result;
}

// Summing-order bound: (k-1) ulp through the lowpass L1 gain, plus its recirculated float32 rounding.
export function roundingBudget(pattern: Pattern, sampleRate: number, peak: number) {
  const { amplitude, frequency } = pattern.continuousPattern;
  const taps = pattern.discretePattern.map(({ time }) => time);
  const overlap = Math.max(
    0,
    ...taps.map(
      (time) => taps.filter((other) => other <= time && time < other + TAP_VOICE_MS).length,
    ),
  );
  const continuous = amplitude.length && frequency.length ? 3 : 0;
  const level = Math.max(0, ...amplitude.map(({ value }) => value));
  const inputs = 3 * overlap + continuous;
  const sum = (Math.max(1, inputs) - 1) * ulp(overlap + (continuous ? 1.3 * level : 0));
  if (!amplitude.length) return sum;
  const { response, poles } = lowpassGains(sampleRate);
  return response * sum + (poles + 1) * ulp(peak);
}
