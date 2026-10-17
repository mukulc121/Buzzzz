import { expect, test } from "bun:test";
import { emptyPattern, MAX_PATTERN_MS, type Pattern } from "@buzzzz/core";
import { applyChartPaste, copyChartRange } from "../src/features/composer/pasteModel";
import { chartGeometry } from "../src/features/composer/geometry";
import { chartMenuItems, hitChartPoint } from "../src/features/composer/chartMenuModel";

const pattern = (): Pattern => ({
  continuousPattern: {
    amplitude: [
      { time: 100, value: 0.2 },
      { time: 300, value: 0.8 },
      { time: 500, value: 0.4 },
    ],
    frequency: [
      { time: 0, value: 0.1 },
      { time: 1000, value: 0.9 },
    ],
  },
  discretePattern: [
    { time: 200, amplitude: 0.7, frequency: 0.3 },
    { time: 700, amplitude: 1, frequency: 0.5 },
  ],
});

test("Copy captures the complete selected time span across every layer with interpolated boundaries", () => {
  const source = pattern();
  const copy = copyChartRange({
    pattern: source,
    selection: [
      { layer: "amplitude", index: 0 },
      { layer: "amplitude", index: 1 },
    ],
    valueDecimals: 1,
  });
  expect(copy).toEqual({
    width: 200,
    pattern: {
      continuousPattern: {
        amplitude: [
          { time: 0, value: 0.2 },
          { time: 200, value: 0.8 },
        ],
        frequency: [
          { time: 0, value: 0.18 },
          { time: 200, value: 0.34 },
        ],
      },
      discretePattern: [{ time: 100, amplitude: 0.7, frequency: 0.3 }],
    },
  });
  expect(source).toEqual(pattern());
});

test("a one-point Copy has zero width and clamps other envelope readings at their endpoints", () => {
  expect(
    copyChartRange({
      pattern: pattern(),
      selection: [{ layer: "discrete", index: 1 }],
      valueDecimals: 1,
    }),
  ).toEqual({
    width: 0,
    pattern: {
      continuousPattern: {
        amplitude: [{ time: 0, value: 0.4 }],
        frequency: [{ time: 0, value: 0.66 }],
      },
      discretePattern: [{ time: 0, amplitude: 1, frequency: 0.5 }],
    },
  });
  expect(
    copyChartRange({
      pattern: pattern(),
      selection: [{ layer: "amplitude", index: 99 }],
      valueDecimals: 1,
    }),
  ).toBeNull();
});

test("Copy boundary rounding uses the published toFixed precision", () => {
  const source = emptyPattern();
  source.continuousPattern.amplitude = [{ time: 0, value: 0.285 }];
  expect(
    copyChartRange({
      pattern: source,
      selection: [{ layer: "amplitude", index: 0 }],
      valueDecimals: 0,
    })?.pattern.continuousPattern.amplitude,
  ).toEqual([{ time: 0, value: 0.28 }]);
  source.continuousPattern.amplitude = [{ time: 0, value: 0.0045 }];
  expect(
    copyChartRange({
      pattern: source,
      selection: [{ layer: "amplitude", index: 0 }],
      valueDecimals: 1,
    })?.pattern.continuousPattern.amplitude,
  ).toEqual([{ time: 0, value: 0.004 }]);
});

test("paste replaces inclusive destination spans only on copied and enabled layers", () => {
  const source = pattern();
  const clipboard = {
    width: 200,
    pattern: {
      ...emptyPattern(),
      continuousPattern: {
        amplitude: [
          { time: 0, value: 0.9 },
          { time: 200, value: 0.6 },
        ],
        frequency: [],
      },
    },
  };
  const result = applyChartPaste({ pattern: source, clipboard, startMs: 100.4, mode: "both" });
  expect(result.continuousPattern.amplitude).toEqual([
    { time: 100, value: 0.9 },
    { time: 300, value: 0.6 },
    { time: 500, value: 0.4 },
  ]);
  expect(result.continuousPattern.frequency).toEqual(source.continuousPattern.frequency);
  expect(result.discretePattern).toEqual(source.discretePattern);
  expect(source).toEqual(pattern());
});

test("Amplitude and Frequency paste modes preserve other layers and zero-width paste replaces matching points", () => {
  const clipboard = { width: 1000, pattern: pattern() };
  const amplitude = applyChartPaste({
    pattern: pattern(),
    clipboard,
    startMs: 0,
    mode: "amplitude",
  });
  expect(amplitude.continuousPattern.frequency).toEqual(pattern().continuousPattern.frequency);
  expect(amplitude.discretePattern).toEqual(pattern().discretePattern);
  const point = {
    width: 0,
    pattern: {
      ...emptyPattern(),
      continuousPattern: { amplitude: [], frequency: [{ time: 0, value: 0.6 }] },
    },
  };
  expect(
    applyChartPaste({ pattern: pattern(), clipboard: point, startMs: -20, mode: "frequency" })
      .continuousPattern.frequency,
  ).toEqual([
    { time: 0, value: 0.6 },
    { time: 1000, value: 0.9 },
  ]);
});

test("invalid paste limits reject atomically", () => {
  const source = pattern();
  expect(() =>
    applyChartPaste({
      pattern: source,
      clipboard: { width: 1000, pattern: source },
      startMs: MAX_PATTERN_MS,
      mode: "both",
    }),
  ).toThrow();
  expect(() =>
    applyChartPaste({
      pattern: source,
      clipboard: { width: 0, pattern: source },
      startMs: NaN,
      mode: "both",
    }),
  ).toThrow();
  expect(source).toEqual(pattern());
});

test("right-click hit testing respects active layer, visibility and the exact source hit regions", () => {
  const geometry = chartGeometry({ width: 800, height: 320, startMs: 0, durationMs: 1000 });
  const options = {
    pattern: pattern(),
    visibleLayers: ["amplitude", "frequency", "discrete"] satisfies (
      | "amplitude"
      | "frequency"
      | "discrete"
    )[],
    geometry,
    x: geometry.x(100),
    y: geometry.y(0.2),
  };
  expect(hitChartPoint({ ...options, layer: "amplitude", x: options.x + 9 })).toEqual({
    layer: "amplitude",
    index: 0,
  });
  expect(hitChartPoint({ ...options, layer: "amplitude", x: options.x + 9.01 })).toBeNull();
  expect(hitChartPoint({ ...options, layer: "frequency" })).toBeNull();
  expect(hitChartPoint({ ...options, layer: "amplitude", visibleLayers: [] })).toBeNull();
  expect(
    hitChartPoint({ ...options, layer: "discrete", x: geometry.x(200) + 11, y: geometry.bottom }),
  ).toEqual({ layer: "discrete", index: 0 });
  expect(
    hitChartPoint({ ...options, layer: "discrete", x: geometry.x(200), y: geometry.y(0.7) - 9.01 }),
  ).toBeNull();
});

test("source menu order and disabled states differ for canvas and selection", () => {
  const options = {
    kind: "canvas",
    selectionCount: 0,
    clipboard: false,
    canUndo: false,
    canRedo: false,
    pattern: emptyPattern(),
    activeLayer: "amplitude",
  } satisfies Parameters<typeof chartMenuItems>[0];
  const menu = chartMenuItems(options);
  expect(menu.map((item) => ("separator" in item ? "|" : item.label))).toEqual([
    "Undo",
    "Redo",
    "|",
    "Add marker here",
    "Save range as snippet…",
    "|",
    "Open from file…",
    "|",
    "Zoom in",
    "Zoom out",
    "|",
    "Move left",
    "Move right",
    "|",
    "Intensity",
    "Frequency",
    "Discrete",
    "|",
    "Select active layer",
    "Clear all",
  ]);
  expect(menu.filter((item) => "disabled" in item && item.disabled)).toHaveLength(4);
  expect(
    chartMenuItems({
      ...options,
      kind: "selection",
      selectionCount: 3,
      clipboard: true,
      pattern: pattern(),
    }).map((item) => ("separator" in item ? "|" : item.label)),
  ).toEqual([
    "Undo",
    "Redo",
    "|",
    "Copy",
    "Paste",
    "Save range as snippet…",
    "|",
    "Delete 3 points",
  ]);
});
