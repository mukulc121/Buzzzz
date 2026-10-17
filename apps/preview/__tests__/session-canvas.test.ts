import { expect, test } from "bun:test";
import { emptyPattern } from "@buzzzz/core";
import {
  formatLibraryTime,
  frequencyColor,
  patternCanvasGeometry,
  scrubTime,
} from "../src/features/sessionLibrary/canvasGeometry";

test("published frequency hues produce the same RGB colors", () => {
  expect([0, 0.25, 0.5, 0.75, 1].map(frequencyColor)).toEqual([
    "rgba(34, 88, 195, 1)",
    "rgba(34, 195, 168, 1)",
    "rgba(34, 195, 34, 1)",
    "rgba(168, 195, 34, 1)",
    "rgba(195, 88, 34, 1)",
  ]);
  expect(frequencyColor(-1)).toBe(frequencyColor(0));
  expect(frequencyColor(2)).toBe(frequencyColor(1));
});

test("pattern canvas uses the published 3px inset, rounded paths and full-height area closure", () => {
  const pattern = emptyPattern();
  pattern.continuousPattern.amplitude = [
    { time: 0, value: 0 },
    { time: 1000, value: 1 },
  ];
  pattern.continuousPattern.frequency = [
    { time: 0, value: 0 },
    { time: 1000, value: 1 },
  ];
  pattern.discretePattern = [{ time: 500, amplitude: 0.5, frequency: 0.5 }];
  const geometry = patternCanvasGeometry(pattern, 1000, 200, 116);
  expect(geometry.line).toBe("M3.0,113.0 L197.0,3.0");
  expect(geometry.area).toBe("M3.0,113.0 L197.0,3.0 L197,116 L3,116 Z");
  expect(geometry.impulses).toEqual([{ x: 100, y: 58, color: "rgba(34, 195, 34, 1)" }]);
  expect(geometry.gradient.map((stop) => stop.offset)).toEqual([0, 1]);
  expect(geometry.baseline).toBe(113);
});

test("scrubbing and time labels use source clamping and nearest-second rounding", () => {
  expect(scrubTime(-10, 200, 1000)).toBe(0);
  expect(scrubTime(100, 200, 1000)).toBe(500);
  expect(scrubTime(300, 200, 1000)).toBe(1000);
  expect(scrubTime(100, 0, 1000)).toBe(0);
  expect([499, 500, 59999, -1].map(formatLibraryTime)).toEqual(["0:00", "0:01", "1:00", "0:00"]);
});
