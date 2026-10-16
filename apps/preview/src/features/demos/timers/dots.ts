import type { Pattern } from "react-native-pulsar";

export const DOT_CYCLE_MS = 1500;
export const DOT_STAGGER_MS = 220;
const DOT_IMPACT_MS = 315;

export const DOT_PATTERNS: Pattern[] = [
  {
    discretePattern: [
      { time: 0, amplitude: 0.8, frequency: 0.9 },
      { time: 40, amplitude: 0, frequency: 0.9 },
    ],
    continuousPattern: { amplitude: [], frequency: [] },
  },
  {
    discretePattern: [
      { time: 0, amplitude: 0.6, frequency: 0.6 },
      { time: 50, amplitude: 0, frequency: 0.6 },
    ],
    continuousPattern: { amplitude: [], frequency: [] },
  },
  {
    discretePattern: [
      { time: 0, amplitude: 0.7, frequency: 0.8 },
      { time: 45, amplitude: 0, frequency: 0.8 },
    ],
    continuousPattern: { amplitude: [], frequency: [] },
  },
];

export const firstDotImpact = (index: number) => DOT_IMPACT_MS + index * DOT_STAGGER_MS;
