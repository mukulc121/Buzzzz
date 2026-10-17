import { expect, test } from "bun:test";
import {
  DEFAULT_EDITOR_SETTINGS,
  parseEditorSettings,
  quantizeValue,
  type IEditorSettings,
} from "../src/features/composer/editorSettings";
import type { PointSelection } from "../src/features/composer/model";
import { chartGrid } from "../src/features/composer/chartGrid";
import { moveSelection } from "../src/features/composer/editing";
import { emptyPattern } from "@buzzzz/core";

test("editor preferences reject invalid fields and preserve supported settings", () => {
  for (const value of [
    null,
    "broken",
    "null",
    "[]",
    JSON.stringify({
      gridDensity: "unbounded",
      valueDecimals: 3,
      crosshair: "yes",
      timeCursor: 1,
      multilayerSelection: {},
    }),
  ])
    expect(parseEditorSettings(value)).toEqual(DEFAULT_EDITOR_SETTINGS);
  const settings: IEditorSettings = {
    gridDensity: "dense",
    valueDecimals: 2,
    crosshair: false,
    timeCursor: false,
    multilayerSelection: false,
  };
  expect(parseEditorSettings(JSON.stringify(settings))).toEqual(settings);
  expect(parseEditorSettings('{"crosshair":false}')).toEqual({
    ...DEFAULT_EDITOR_SETTINGS,
    crosshair: false,
  });
});
test("grid density controls major lines, subdivisions and label spacing", () => {
  const geometry = { width: 700, height: 600, startMs: 150, durationMs: 2200 };
  const sparse = chartGrid({ ...geometry, density: "sparse" });
  const normal = chartGrid({ ...geometry, density: "normal" });
  const dense = chartGrid({ ...geometry, density: "dense" });
  const count = (grid: typeof sparse) =>
    grid.time.major.length +
    grid.time.minor.length +
    grid.value.major.length +
    grid.value.minor.length;
  expect(count(sparse)).toBeLessThan(count(normal));
  expect(count(normal)).toBeLessThan(count(dense));
  expect(sparse.time.minor).toEqual([]);
  expect(normal.time.minor.length).toBeGreaterThan(0);
  expect(chartGrid({ ...geometry, density: "off" })).toEqual({
    time: { major: [], minor: [], labels: [] },
    value: { major: [], minor: [], labels: [] },
  });
  expect(dense.time.major.every((value) => value >= 150 && value <= 2350)).toBe(true);
  expect(chartGrid({ ...geometry, width: 0, density: "normal" }).time.major).toEqual([]);
});
test("new value edits honor percentage precision without changing values on time-only moves", () => {
  expect([0, 1, 2].map((decimals) => quantizeValue(0.64366, decimals))).toEqual([
    0.64, 0.644, 0.6437,
  ]);
  expect(quantizeValue(-2, 2)).toBe(0);
  expect(quantizeValue(2, 2)).toBe(1);
  const pattern = emptyPattern();
  pattern.continuousPattern.amplitude.push({ time: 100, value: 0.64366 });
  const selection: PointSelection[] = [{ layer: "amplitude", index: 0 }];
  expect(
    moveSelection({ pattern, selection, timeMs: 10, value: 0, valueDecimals: 0 }).continuousPattern
      .amplitude[0],
  ).toEqual({ time: 110, value: 0.64366 });
  expect(
    moveSelection({ pattern, selection, timeMs: 0, value: 0.01, valueDecimals: 0 })
      .continuousPattern.amplitude[0].value,
  ).toBe(0.65);
  expect(pattern.continuousPattern.amplitude[0].value).toBe(0.64366);
});
