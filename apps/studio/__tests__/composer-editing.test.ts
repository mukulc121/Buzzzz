import { expect, test } from "bun:test";
import { emptyPattern, isPattern, MAX_PATTERN_MS, type Pattern } from "@buzzzz/core";
import {
  copySelection,
  deleteSelection,
  duplicateSelection,
  moveSelection,
  pasteSelection,
  selectInBounds,
} from "../src/features/composer/editing";
import type { PointSelection } from "../src/features/composer/model";
import { clampViewport, snapTime, zoomViewport } from "../src/features/composer/viewport";

const fixture = (): Pattern => ({
  discretePattern: [{ time: 300, amplitude: 0.8, frequency: 0.35 }],
  continuousPattern: {
    amplitude: [
      { time: 100, value: 0.2 },
      { time: 200, value: 0.6 },
    ],
    frequency: [{ time: 150, value: 0.4 }],
  },
});
const group: PointSelection[] = [
  { layer: "amplitude", index: 0 },
  { layer: "discrete", index: 0 },
];

test("moving a mixed selection preserves spacing and clamps the whole group", () => {
  const pattern = fixture();
  const original = structuredClone(pattern);
  const next = moveSelection({ pattern, selection: group, timeMs: -500, value: 1 });
  expect(next.continuousPattern.amplitude[0].time).toBe(0);
  expect(next.continuousPattern.amplitude[0].value).toBeCloseTo(0.4);
  expect(next.discretePattern[0]).toEqual({ time: 200, amplitude: 1, frequency: 0.35 });
  expect(next.continuousPattern.amplitude[1]).toBe(pattern.continuousPattern.amplitude[1]);
  expect(pattern).toEqual(original);
  expect(isPattern(next)).toBe(true);
  const end = moveSelection({ pattern, selection: group, timeMs: MAX_PATTERN_MS, value: -1 });
  expect(end.continuousPattern.amplitude[0].time).toBe(MAX_PATTERN_MS - 200);
  expect(end.discretePattern[0].amplitude).toBeCloseTo(0.6);
});

test("copy normalizes mixed layers, deduplicates selection and ignores missing points", () => {
  const clipboard = copySelection({
    pattern: fixture(),
    selection: [...group, ...group, { layer: "frequency", index: 99 }],
  });
  expect(clipboard.continuousPattern.amplitude).toEqual([{ time: 0, value: 0.2 }]);
  expect(clipboard.discretePattern).toEqual([{ time: 200, amplitude: 0.8, frequency: 0.35 }]);
  expect(clipboard.continuousPattern.frequency).toEqual([]);
  const result = pasteSelection({ pattern: fixture(), clipboard, atMs: MAX_PATTERN_MS });
  expect(result.pattern.continuousPattern.amplitude.at(-1)?.time).toBe(MAX_PATTERN_MS - 200);
  expect(result.pattern.discretePattern.at(-1)?.time).toBe(MAX_PATTERN_MS);
  expect(result.selection).toEqual([
    { layer: "amplitude", index: 2 },
    { layer: "discrete", index: 1 },
  ]);
  expect(isPattern(result.pattern)).toBe(true);
});

test("duplicate returns only new point indices, and delete leaves other layers unchanged", () => {
  const pattern = fixture();
  const result = duplicateSelection({ pattern, selection: group, offsetMs: 25 });
  expect(result.pattern.continuousPattern.amplitude.at(-1)).toEqual({ time: 125, value: 0.2 });
  expect(result.pattern.discretePattern.at(-1)).toEqual({
    time: 325,
    amplitude: 0.8,
    frequency: 0.35,
  });
  expect(deleteSelection({ pattern: result.pattern, selection: result.selection })).toEqual(
    pattern,
  );
  expect(deleteSelection({ pattern, selection: group }).continuousPattern.frequency).toEqual(
    pattern.continuousPattern.frequency,
  );
});

test("paste rejects point overflow without mutating its source", () => {
  const pattern = emptyPattern();
  pattern.continuousPattern.amplitude = Array.from({ length: 10000 }, (_, time) => ({
    time,
    value: 0.5,
  }));
  const clipboard = copySelection({ pattern: fixture(), selection: group });
  expect(() => pasteSelection({ pattern, clipboard, atMs: 0 })).toThrow("point limit");
  expect(pattern.continuousPattern.amplitude).toHaveLength(10000);
  expect(pattern.discretePattern).toHaveLength(0);
});

test("rectangle selection includes boundaries and excludes hidden layers", () => {
  expect(
    selectInBounds({
      pattern: fixture(),
      layers: ["amplitude", "discrete"],
      bounds: { startMs: 100, endMs: 200, minValue: 0.2, maxValue: 0.6 },
    }),
  ).toEqual([
    { layer: "amplitude", index: 0 },
    { layer: "amplitude", index: 1 },
  ]);
});

test("viewport zoom anchors time, pan clamps bounds, and snapping stays valid", () => {
  expect(zoomViewport({ startMs: 1000, durationMs: 4000, factor: 0.5, anchor: 0.25 })).toEqual({
    startMs: 1500,
    durationMs: 2000,
  });
  expect(clampViewport({ startMs: -100, durationMs: 10 })).toEqual({ startMs: 0, durationMs: 20 });
  expect(clampViewport({ startMs: MAX_PATTERN_MS, durationMs: 1000 })).toEqual({
    startMs: 59000,
    durationMs: 1000,
  });
  expect(zoomViewport({ startMs: 1000, durationMs: 4000, factor: 100, anchor: 0.5 })).toEqual({
    startMs: 0,
    durationMs: MAX_PATTERN_MS,
  });
  expect([snapTime(127, 25), snapTime(-10, 25), snapTime(60012, 25), snapTime(10.7, 0)]).toEqual([
    125, 0, 60000, 11,
  ]);
});
