import type { Pattern } from "@buzzzz/core";

export const COUNTDOWN_SECONDS = 7;
export const COUNTDOWN_PATTERNS = {
  soft: {
    discretePattern: [
      { time: 0, amplitude: 0.6, frequency: 0.7 },
      { time: 30, amplitude: 0, frequency: 0.7 },
    ],
    continuousPattern: { amplitude: [], frequency: [] },
  },
  strong: {
    discretePattern: [
      { time: 0, amplitude: 0.85, frequency: 0.85 },
      { time: 40, amplitude: 0, frequency: 0.85 },
    ],
    continuousPattern: { amplitude: [], frequency: [] },
  },
  done: {
    discretePattern: [
      { time: 0, amplitude: 0.9, frequency: 0.5 },
      { time: 50, amplitude: 0, frequency: 0.5 },
      { time: 100, amplitude: 0.9, frequency: 0.5 },
      { time: 150, amplitude: 0, frequency: 0.5 },
    ],
    continuousPattern: { amplitude: [], frequency: [] },
  },
} satisfies Record<"soft" | "strong" | "done", Pattern>;

export const tickKind = (remaining: number) =>
  remaining <= 0 ? "done" : remaining <= 2 ? "strong" : "soft";
