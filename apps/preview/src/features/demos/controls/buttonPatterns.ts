import type { Pattern } from "@buzzzz/core";
import { tapsPattern } from "../shared/patterns";

export const doubleTap = (): Pattern =>
  tapsPattern([
    { time: 0, amplitude: 0.9, frequency: 0.5 },
    { time: 110, amplitude: 0.9, frequency: 0.5 },
  ]);

export const rampUp = (): Pattern => ({
  discretePattern: [{ time: 400, amplitude: 1, frequency: 0.8 }],
  continuousPattern: {
    amplitude: [
      { time: 0, value: 0.1 },
      { time: 380, value: 0.8 },
      { time: 400, value: 0 },
    ],
    frequency: [
      { time: 0, value: 0.2 },
      { time: 400, value: 0.9 },
    ],
  },
});

export const heartbeat = (): Pattern =>
  tapsPattern([
    { time: 0, amplitude: 1, frequency: 0.2 },
    { time: 140, amplitude: 0.6, frequency: 0.2 },
    { time: 800, amplitude: 1, frequency: 0.2 },
    { time: 940, amplitude: 0.6, frequency: 0.2 },
  ]);
