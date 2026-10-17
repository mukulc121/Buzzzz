import { expect, test } from "bun:test";
import { isPattern } from "@buzzzz/core";
import {
  crossedSliderTick,
  SLIDER_PRESETS,
  sliderPosition,
  sliderValue,
} from "../src/features/demos/controls/sliderModel";

test("published slider presets retain their distinct pulse and silent endpoint", () => {
  expect(SLIDER_PRESETS.map((preset) => preset.title)).toEqual([
    "Quick Tick",
    "Soft Tick",
    "Deep Tick",
  ]);
  expect(SLIDER_PRESETS.map((preset) => preset.pattern.discretePattern)).toEqual([
    [
      { time: 0, amplitude: 1, frequency: 1 },
      { time: 40, amplitude: 0, frequency: 1 },
    ],
    [
      { time: 0, amplitude: 0.6, frequency: 0.4 },
      { time: 60, amplitude: 0, frequency: 0.4 },
    ],
    [
      { time: 0, amplitude: 0.8, frequency: 0.2 },
      { time: 80, amplitude: 0, frequency: 0.2 },
    ],
  ]);
  for (const preset of SLIDER_PRESETS) expect(isPattern(preset.pattern)).toBe(true);
});

test("slider coordinates keep the thumb in bounds and map its centers to 0, 50, 100", () => {
  expect([-50, 15, 115, 215, 400].map((x) => sliderValue(x, 230))).toEqual([0, 0, 50, 100, 100]);
  expect(sliderPosition(-50, 230)).toBe(15);
  expect(sliderPosition(400, 230)).toBe(215);
  expect(sliderValue(15, 0)).toBe(50);
});

test("ticks fire on bucket crossings in either direction, not on every value change", () => {
  expect(
    [
      [50, 59],
      [59, 60],
      [60, 59],
      [50, 49],
      [51, 50],
      [99, 100],
      [100, 0],
    ].map(([previous, next]) => crossedSliderTick(previous, next)),
  ).toEqual([false, true, true, true, false, true, true]);
});
