import { describe, expect, test } from "bun:test";
import { emptyPattern, isPattern, patternEnd, type Pattern } from "@buzzzz/core";
import { rhythmPattern, snippetRange, warpPattern } from "../src/features/tools/patternMath";
import { patternStats } from "../src/features/tools/signalStats";
import { compatibilityIssues } from "../src/features/tools/compatibility";
import { voicePattern } from "../src/features/tools/voicePattern";
import { workerClip } from "../src/features/audio/signal/mix";
import { analyzeVoice } from "../src/features/audio/voice/analysis";

const pattern: Pattern = {
  discretePattern: [
    { time: 250, amplitude: 0.8, frequency: 0.4 },
    { time: 750, amplitude: 0.6, frequency: 0.7 },
  ],
  continuousPattern: {
    amplitude: [
      { time: 0, value: 0 },
      { time: 500, value: 1 },
      { time: 1000, value: 0 },
    ],
    frequency: [
      { time: 0, value: 0.2 },
      { time: 1000, value: 0.8 },
    ],
  },
};

describe("time warp", () => {
  test("reverses every layer and stretches without changing the source", () => {
    const before = structuredClone(pattern);
    const changed = warpPattern(pattern, { stretch: 2, reverse: true, quantizeMs: 0 });
    expect(changed.discretePattern.map((tap) => tap.time)).toEqual([500, 1500]);
    expect(changed.continuousPattern.frequency).toEqual([
      { time: 0, value: 0.8 },
      { time: 2000, value: 0.2 },
    ]);
    expect(pattern).toEqual(before);
    expect(isPattern(changed)).toBe(true);
  });
  test("merges snapped points and refuses overflow instead of truncating", () => {
    const source = rhythmPattern([0, 11, 14], 0.8, 0.5);
    expect(
      warpPattern(source, { stretch: 1, reverse: false, quantizeMs: 100 }).discretePattern,
    ).toHaveLength(1);
    expect(() =>
      warpPattern(rhythmPattern([60000], 1, 0.5), { stretch: 2, reverse: false, quantizeMs: 0 }),
    ).toThrow();
  });
});

describe("snippet ranges", () => {
  test("interpolates crop boundaries and shifts all layers together", () => {
    const result = snippetRange(pattern, 250, 750);
    expect(result.continuousPattern.amplitude).toEqual([
      { time: 0, value: 0.5 },
      { time: 250, value: 1 },
      { time: 500, value: 0.5 },
    ]);
    expect(result.discretePattern.map((tap) => tap.time)).toEqual([0, 500]);
    expect(patternEnd(result)).toBe(500);
  });
  test("preserves silence around taps and empty ranges", () => {
    const result = snippetRange(rhythmPattern([300], 1, 0.5), 100, 1100);
    expect(result.discretePattern[0]?.time).toBe(200);
    expect(result.continuousPattern.amplitude).toEqual([
      { time: 0, value: 0 },
      { time: 1000, value: 0 },
    ]);
    expect(patternEnd(snippetRange(emptyPattern(), 100, 2100))).toBe(2000);
  });
  test("does not turn trailing silence into a long envelope fade", () => {
    const source = emptyPattern();
    source.continuousPattern.amplitude = [
      { time: 100, value: 1 },
      { time: 200, value: 1 },
    ];
    const result = snippetRange(source, 0, 1000);
    expect(result.continuousPattern.amplitude).toContainEqual({ time: 201, value: 0 });
    expect(result.continuousPattern.amplitude.at(-1)).toEqual({ time: 1000, value: 0 });
  });
  test.each([
    [0, 0],
    [-1, 100],
    [0, 60001],
    [0.1, 10],
  ])("rejects invalid range %s,%s", (start, end) => {
    expect(() => snippetRange(pattern, start, end)).toThrow();
  });
});

test("rhythm capture bounds taps and rejects invalid intensity", () => {
  const result = rhythmPattern([-1, 0, 500, 1000, 60001, Number.NaN], 0.8, 0.4);
  expect(result.discretePattern.map((tap) => tap.time)).toEqual([0, 500, 1000]);
  expect(patternStats(result).tempoBpm).toBe(120);
  expect(() => rhythmPattern([0], Number.NaN, 0.4)).toThrow();
});

test("signal analysis uses time-weighted envelope intensity", () => {
  expect(patternStats(pattern)).toMatchObject({
    durationMs: 1000,
    envelopePoints: 5,
    taps: 2,
    peak: 1,
    average: 0.5,
    tempoBpm: 120,
  });
  expect(patternStats(emptyPattern()).average).toBe(0);
  const stats = patternStats(pattern);
  expect(stats.dutyCycle).toBeCloseTo(0.99);
  expect(stats.meanFrequency).toBeCloseTo(0.5);
  expect(stats.tightestGapMs).toBe(500);
  expect(stats.eventsPerSecond).toBe(7);
  expect(stats.intensityBudget).toBeCloseTo(1 / 3 + 0.01);
  expect(patternStats(emptyPattern()).meanFrequency).toBeNull();
});

test("compatibility distinguishes near taps from short envelope segments", () => {
  const source = rhythmPattern([0, 8], 1, 0.5);
  source.continuousPattern.amplitude = [
    { time: 0, value: 0 },
    { time: 15, value: 1 },
  ];
  const issues = compatibilityIssues(source, "full");
  expect(issues.some((issue) => issue.includes("Taps less than 10"))).toBe(true);
  expect(issues.some((issue) => issue.includes("segments shorter than 20"))).toBe(true);
});

test("voice analysis rejects silence and combines loudness, pitch, and onsets", () => {
  const samples = new Float32Array(16000);
  expect(() => voicePattern(analyzeVoice(workerClip([samples], 16000)))).toThrow("No voice");
  for (let index = 0; index < samples.length; index += 1)
    samples[index] = index % 4000 < 2000 ? Math.sin((2 * Math.PI * 220 * index) / 16000) * 0.4 : 0;
  const result = voicePattern(analyzeVoice(workerClip([samples], 16000)));
  expect(isPattern(result)).toBe(true);
  expect(result.continuousPattern.amplitude.length).toBeGreaterThan(0);
  expect(result.continuousPattern.frequency.length).toBeGreaterThan(0);
  expect(result.discretePattern.length).toBeGreaterThan(0);
});

test("compatibility tiers report actual lost controls", () => {
  const taps = rhythmPattern([0, 500], 1, 0.5);
  expect(compatibilityIssues(taps, "full")).toEqual([]);
  expect(compatibilityIssues(taps, "basic")).toEqual([]);
  expect(
    compatibilityIssues(pattern, "amplitude").some((issue) => issue.includes("Frequency")),
  ).toBe(true);
  expect(compatibilityIssues(pattern, "basic").some((issue) => issue.includes("Intensity"))).toBe(
    true,
  );
  expect(compatibilityIssues(pattern, "none")).toEqual(["This device tier cannot play haptics."]);
});
