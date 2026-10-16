import type { Pattern } from "@buzzzz/core";

interface ITap {
  time: number;
  amplitude: number;
  frequency: number;
}

export const tapsPattern = (taps: ITap[]): Pattern => ({
  discretePattern: taps,
  continuousPattern: { amplitude: [], frequency: [] },
});

export const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
