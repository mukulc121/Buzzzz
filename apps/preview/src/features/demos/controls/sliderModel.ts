import type { Pattern } from "react-native-pulsar";

export const SLIDER_THUMB_SIZE = 30;

function tickPattern(amplitude: number, frequency: number, duration: number): Pattern {
  return {
    discretePattern: [
      { time: 0, amplitude, frequency },
      { time: duration, amplitude: 0, frequency },
    ],
    continuousPattern: { amplitude: [], frequency: [] },
  };
}

export const SLIDER_PRESETS = [
  { title: "Quick Tick", pattern: tickPattern(1, 1, 40) },
  { title: "Soft Tick", pattern: tickPattern(0.6, 0.4, 60) },
  { title: "Deep Tick", pattern: tickPattern(0.8, 0.2, 80) },
];

export function sliderPosition(position: number, width: number) {
  "worklet";
  return Math.max(SLIDER_THUMB_SIZE / 2, Math.min(position, width - SLIDER_THUMB_SIZE / 2));
}

export function sliderValue(position: number, width: number) {
  "worklet";
  if (width <= SLIDER_THUMB_SIZE) return 50;
  return Math.round(
    ((sliderPosition(position, width) - SLIDER_THUMB_SIZE / 2) / (width - SLIDER_THUMB_SIZE)) * 100,
  );
}

export function crossedSliderTick(previous: number, next: number) {
  "worklet";
  return Math.floor(previous / 10) !== Math.floor(next / 10);
}
