import { describe, expect, test } from "bun:test";
import { isPattern, MAX_PATTERN_MS } from "@buzzzz/core";
import {
  appendSample,
  appendTap,
  padValue,
  recordedPattern,
  recording,
} from "../src/features/playground/recording";

describe("native playground recording", () => {
  test("maps and clamps touch position to intensity and frequency", () => {
    expect(padValue(0, 0, 100, 100)).toEqual({ amplitude: 1, frequency: 0 });
    expect(padValue(120, 120, 100, 100)).toEqual({ amplitude: 0, frequency: 1 });
    expect(padValue(25, 50, 100, 100)).toEqual({ amplitude: 0.5, frequency: 0.25 });
  });
  test("quantizes drag samples and records release silence within protocol limits", () => {
    const record = recording();
    appendSample(record, { amplitude: 0.5, frequency: 0.25 }, record.startedAt + 10);
    appendSample(record, { amplitude: 0.8, frequency: 0.5 }, record.startedAt + 12);
    appendTap(record, { amplitude: 1, frequency: 0.5 }, record.startedAt + 30);
    appendSample(record, null, record.startedAt + MAX_PATTERN_MS + 100);
    const pattern = recordedPattern(record);
    expect(pattern.continuousPattern.amplitude).toEqual([
      { time: 10, value: 0.8 },
      { time: MAX_PATTERN_MS, value: 0 },
    ]);
    expect(pattern.continuousPattern.frequency.at(-1)?.value).toBe(0.5);
    expect(pattern.discretePattern).toEqual([{ time: 30, amplitude: 1, frequency: 0.5 }]);
    expect(isPattern(pattern)).toBe(true);
  });
});
