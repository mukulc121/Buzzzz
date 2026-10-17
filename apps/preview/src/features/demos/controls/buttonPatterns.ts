import type { Pattern } from "@buzzzz/core";

export const BUTTON_PATTERNS = [
  {
    label: "Tap",
    pattern: {
      discretePattern: [{ time: 0, amplitude: 1, frequency: 1 }],
      continuousPattern: { amplitude: [], frequency: [] },
    },
  },
  {
    label: "Soft",
    pattern: {
      discretePattern: [{ time: 0, amplitude: 0.4, frequency: 0.7 }],
      continuousPattern: { amplitude: [], frequency: [] },
    },
  },
  {
    label: "Deep",
    pattern: {
      discretePattern: [{ time: 0, amplitude: 0.9, frequency: 0.1 }],
      continuousPattern: { amplitude: [], frequency: [] },
    },
  },
  {
    label: "Double",
    pattern: {
      discretePattern: [
        { time: 0, amplitude: 0.9, frequency: 0.8 },
        { time: 60, amplitude: 0.9, frequency: 0.8 },
      ],
      continuousPattern: { amplitude: [], frequency: [] },
    },
  },
  {
    label: "Knock",
    pattern: {
      discretePattern: [
        { time: 0, amplitude: 1, frequency: 0.3 },
        { time: 180, amplitude: 0.8, frequency: 0.25 },
      ],
      continuousPattern: { amplitude: [], frequency: [] },
    },
  },
  {
    label: "Ripple",
    pattern: {
      discretePattern: [
        { time: 0, amplitude: 1, frequency: 0.7 },
        { time: 70, amplitude: 0.7, frequency: 0.55 },
        { time: 140, amplitude: 0.45, frequency: 0.45 },
        { time: 210, amplitude: 0.25, frequency: 0.35 },
      ],
      continuousPattern: { amplitude: [], frequency: [] },
    },
  },
] satisfies { label: string; pattern: Pattern }[];
