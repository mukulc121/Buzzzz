import { expect, test } from "bun:test";
import { emptyPattern, patternEnd, type Pattern } from "@buzzzz/core";
import {
  captureSnippetRange,
  initialSnippetRange,
  normalizeSnippet,
} from "../src/features/composer/snippetRangeModel";

const pattern: Pattern = {
  discretePattern: [
    { time: 100, amplitude: 0.4, frequency: 0.3 },
    { time: 700, amplitude: 0.8, frequency: 0.2 },
  ],
  continuousPattern: {
    amplitude: [
      { time: 0, value: 0.2 },
      { time: 1000, value: 0.8 },
      { time: 2000, value: 0 },
    ],
    frequency: [
      { time: 0, value: 0.3 },
      { time: 2000, value: 0.6 },
    ],
  },
};

test("snippet rails use selected time bounds only when at least 10 ms wide", () => {
  const options = { pattern, viewport: { startMs: 0, durationMs: 2000 }, durationMs: 2000 };
  expect(
    initialSnippetRange({
      ...options,
      selection: [
        { layer: "discrete", index: 0 },
        { layer: "discrete", index: 1 },
      ],
    }),
  ).toEqual({ start: 100, end: 700 });
  expect(initialSnippetRange({ ...options, selection: [{ layer: "discrete", index: 0 }] })).toEqual(
    { start: 500, end: 1500 },
  );
  expect(initialSnippetRange({ ...options, durationMs: 100, selection: [] })).toEqual({
    start: 0,
    end: 100,
  });
});

test("snippet capture interpolates both envelopes, retains boundary impulses and offsets the range", () => {
  expect(captureSnippetRange(pattern, { start: 100, end: 700 }, 1)).toEqual({
    discretePattern: [
      { time: 0, amplitude: 0.4, frequency: 0.3 },
      { time: 600, amplitude: 0.8, frequency: 0.2 },
    ],
    continuousPattern: {
      amplitude: [
        { time: 0, value: 0.26 },
        { time: 600, value: 0.62 },
      ],
      frequency: [
        { time: 0, value: 0.315 },
        { time: 600, value: 0.405 },
      ],
    },
  });
  expect(captureSnippetRange(pattern, { start: 700, end: 100 }, 1)).toEqual(
    captureSnippetRange(pattern, { start: 100, end: 700 }, 1),
  );
});

test("empty envelopes remain empty and zero-width capture creates no snippet", () => {
  const discrete = { ...emptyPattern(), discretePattern: pattern.discretePattern };
  expect(captureSnippetRange(discrete, { start: 0, end: 500 }, 1)).toEqual({
    ...emptyPattern(),
    discretePattern: [pattern.discretePattern[0]],
  });
  expect(captureSnippetRange(pattern, { start: 100, end: 100 }, 1)).toBeNull();
  const clipped = captureSnippetRange(discrete, { start: 0, end: 500 }, 1);
  expect(clipped && patternEnd(clipped)).toBe(100);
});

test("whole pattern snippets remove only leading silence and preserve source values", () => {
  const shifted = {
    discretePattern: pattern.discretePattern.map((point) => ({ ...point, time: point.time + 50 })),
    continuousPattern: {
      amplitude: pattern.continuousPattern.amplitude.map((point) => ({
        ...point,
        time: point.time + 50,
      })),
      frequency: pattern.continuousPattern.frequency.map((point) => ({
        ...point,
        time: point.time + 50,
      })),
    },
  };
  expect(normalizeSnippet(shifted)).toEqual(pattern);
  expect(normalizeSnippet(emptyPattern())).toEqual(emptyPattern());
});
