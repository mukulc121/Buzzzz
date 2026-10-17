import { describe, expect, test } from "bun:test";
import { emptyPattern, isPattern, patternEnd, type Pattern } from "@buzzzz/core";
import { filterStudioPresets, studioPresets } from "../src/features/presets/catalog";
import { insertLibraryPattern } from "../src/features/presets/insertPattern";

test("Studio uses its 151 source presets and all selected tags constrain search", () => {
  expect(studioPresets).toHaveLength(151);
  expect(new Set(studioPresets.map((entry) => entry.id)).size).toBe(151);
  expect(studioPresets.every((entry) => isPattern(entry.pattern))).toBe(true);
  expect(studioPresets[0]?.name).toBe("Afterglow");
  expect(filterStudioPresets({ query: " ALARM ", tags: [] }).map((entry) => entry.id)).toEqual([
    "alarm",
    "wobble",
  ]);
  const filtered = filterStudioPresets({ query: "", tags: ["Bold", "Rigid"] });
  expect(filtered).toHaveLength(28);
  expect(
    filtered.every((entry) => entry.tags.includes("Bold") && entry.tags.includes("Rigid")),
  ).toBe(true);
  expect(filterStudioPresets({ query: "alarm", tags: ["Gentle"] })).toEqual([]);
});

describe("library insertion", () => {
  const current: Pattern = {
    continuousPattern: {
      amplitude: [
        { time: 0, value: 0 },
        { time: 100, value: 1 },
        { time: 200, value: 0.2 },
        { time: 300, value: 0 },
      ],
      frequency: [
        { time: 0, value: 0.5 },
        { time: 300, value: 0.5 },
      ],
    },
    discretePattern: [{ time: 150, amplitude: 0.5, frequency: 0.5 }],
  };

  test("replaces only incoming layers within the insertion span and keeps the source unchanged", () => {
    const before = structuredClone(current);
    const incoming = emptyPattern();
    incoming.continuousPattern.amplitude = [
      { time: 0, value: 0.3 },
      { time: 100, value: 0.7 },
    ];
    const result = insertLibraryPattern(current, incoming, 100);
    expect(result.continuousPattern.amplitude).toEqual([
      { time: 0, value: 0 },
      { time: 100, value: 0.3 },
      { time: 200, value: 0.7 },
      { time: 300, value: 0 },
    ]);
    expect(result.continuousPattern.frequency).toEqual(current.continuousPattern.frequency);
    expect(result.discretePattern).toEqual(current.discretePattern);
    result.discretePattern.forEach((point) => {
      point.amplitude = 1;
    });
    expect(current).toEqual(before);
  });

  test("appends at the active duration, preserves separate layers and rejects overflow", () => {
    const incoming = emptyPattern();
    incoming.discretePattern = [{ time: 0, amplitude: 0.8, frequency: 0.2 }];
    const result = insertLibraryPattern(current, incoming, patternEnd(current));
    expect(result.discretePattern.map((point) => point.time)).toEqual([150, 300]);
    expect(result.continuousPattern).toEqual(current.continuousPattern);
    expect(insertLibraryPattern(current, incoming, -20).discretePattern[0]?.time).toBe(0);
    incoming.discretePattern = [{ time: 1, amplitude: 0.8, frequency: 0.2 }];
    expect(() => insertLibraryPattern(current, incoming, 60000)).toThrow("60 seconds");
    expect(() => insertLibraryPattern(current, incoming, Number.NaN)).toThrow("60 seconds");
  });
});
