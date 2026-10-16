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
