import { describe, expect, test } from "bun:test";
import { MAX_PATTERN_MS } from "@buzzzz/core";
import {
  MIN_RANGE_MS,
  MIN_VIEW_MS,
  curvePoints,
  dragRange,
  dragViewport,
  fractionOf,
  keyDelta,
  normalize,
  timeAtPointer,
  timelineEnd,
} from "../src/features/composer/timelineGeometry";

const view = { startMs: 1000, durationMs: 2000 };

describe("timelineEnd", () => {
  test("covers pattern, media, range and view, exact and capped at 60s", () => {
    const bounds = {
      patternMs: 0,
      mediaMs: 0,
      viewport: { startMs: 0, durationMs: 500 },
      range: null,
    };
    expect(timelineEnd(bounds)).toBe(500);
    expect(timelineEnd({ ...bounds, patternMs: 2000 })).toBe(2000);
    expect(timelineEnd({ ...bounds, mediaMs: 3200 })).toBe(3200);
    expect(timelineEnd({ ...bounds, range: { start: 0, end: 4100 } })).toBe(4100);
    expect(timelineEnd({ ...bounds, viewport: { startMs: 5000, durationMs: 2000 } })).toBe(7000);
    expect(timelineEnd({ ...bounds, mediaMs: 90_000 })).toBe(MAX_PATTERN_MS);
  });
});

describe("pointer mapping", () => {
  test("clamps outside the track and survives a zero-width track", () => {
    expect(timeAtPointer({ clientX: 150, left: 100, width: 200, end: 4000 })).toBe(1000);
    expect(timeAtPointer({ clientX: 0, left: 100, width: 200, end: 4000 })).toBe(0);
    expect(timeAtPointer({ clientX: 900, left: 100, width: 200, end: 4000 })).toBe(4000);
    expect(timeAtPointer({ clientX: 150, left: 100, width: 0, end: 4000 })).toBe(0);
    expect(fractionOf(500, 0)).toBe(0);
    expect(fractionOf(-10, 1000)).toBe(0);
  });
});

describe("dragViewport", () => {
  test("pan keeps duration and stays inside the timeline", () => {
    expect(dragViewport({ viewport: view, part: "pan", deltaMs: 500, end: 5000 })).toEqual({
      startMs: 1500,
      durationMs: 2000,
    });
    expect(dragViewport({ viewport: view, part: "pan", deltaMs: -5000, end: 5000 })).toEqual({
      startMs: 0,
      durationMs: 2000,
    });
    expect(dragViewport({ viewport: view, part: "pan", deltaMs: Infinity, end: 5000 })).toEqual({
      startMs: 3000,
      durationMs: 2000,
    });
  });

  test("handles resize one edge and never cross the minimum width", () => {
    expect(dragViewport({ viewport: view, part: "start", deltaMs: -400, end: 5000 })).toEqual({
      startMs: 600,
      durationMs: 2400,
    });
    expect(dragViewport({ viewport: view, part: "start", deltaMs: 9000, end: 5000 })).toEqual({
      startMs: 3000 - MIN_VIEW_MS,
      durationMs: MIN_VIEW_MS,
    });
    expect(dragViewport({ viewport: view, part: "end", deltaMs: -9000, end: 5000 })).toEqual({
      startMs: 1000,
      durationMs: MIN_VIEW_MS,
    });
    expect(dragViewport({ viewport: view, part: "end", deltaMs: 9000, end: 5000 })).toEqual({
      startMs: 1000,
      durationMs: 4000,
    });
  });

  test("zero delta is a no-op, so a cancelled drag restores the origin", () => {
    expect(dragViewport({ viewport: view, part: "end", deltaMs: 0, end: 5000 })).toEqual(view);
  });
});

describe("dragRange", () => {
  const range = { start: 200, end: 800 };
  test("moves, resizes and clamps the playback range", () => {
    expect(dragRange({ range, part: "pan", deltaMs: 300, end: 1000 })).toEqual({
      start: 400,
      end: 1000,
    });
    expect(dragRange({ range, part: "start", deltaMs: -500, end: 1000 })).toEqual({
      start: 0,
      end: 800,
    });
    expect(dragRange({ range, part: "start", deltaMs: 900, end: 1000 })).toEqual({
      start: 800 - MIN_RANGE_MS,
      end: 800,
    });
    expect(dragRange({ range, part: "end", deltaMs: -Infinity, end: 1000 })).toEqual({
      start: 200,
      end: 200 + MIN_RANGE_MS,
    });
  });
});

describe("keyboard and drawing helpers", () => {
  test("maps slider keys to millisecond deltas", () => {
    expect(keyDelta("ArrowRight", false)).toBe(10);
    expect(keyDelta("ArrowLeft", true)).toBe(-100);
    expect(keyDelta("PageUp", false)).toBe(1000);
    expect(keyDelta("Home", false)).toBe(-Infinity);
    expect(keyDelta("a", false)).toBeNull();
  });

  test("curves and normalisation share the same time axis", () => {
    expect(curvePoints([{ time: 500, value: 0.5 }], 1000, 40)).toBe("500,20");
    expect(
      normalize(
        [2, 4],
        (value) => value,
        (value) => value * 100,
      ),
    ).toEqual([
      { time: 200, value: 0.5 },
      { time: 400, value: 1 },
    ]);
    expect(
      normalize(
        [0, 0],
        (value) => value,
        () => 0,
      )[0]?.value,
    ).toBe(0);
  });
});
