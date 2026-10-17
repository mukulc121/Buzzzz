import { describe, expect, test } from "bun:test";
import { isPattern } from "@buzzzz/core";
import {
  indicatorPosition,
  MAX_RECORDING_DURATION_MS,
  padValue,
  patternShareMessage,
  playgroundTimer,
  recordedPattern,
  type IPlaygroundEvent,
} from "../src/features/playground/recording";

describe("published native Playground behavior", () => {
  test("normal gestures keep the source 20% intensity floor while the tutorial uses the whole axis", () => {
    expect(padValue(0, 0, 100, 100)).toEqual({ amplitude: 1, frequency: 0 });
    expect(padValue(120, 120, 100, 100)).toEqual({ amplitude: 0.2, frequency: 1 });
    expect(padValue(25, 50, 100, 100).amplitude).toBeCloseTo(0.6);
    expect(padValue(25, 50, 100, 100, true)).toEqual({ amplitude: 0.5, frequency: 0.25 });
    expect(padValue(0, 0, 0, 0)).toEqual({ amplitude: 1, frequency: 0 });
    expect(indicatorPosition(0, 200, 100, 100)).toEqual({ x: 15, y: 85 });
    expect(indicatorPosition(-100, -100, 100, 100)).toEqual({ x: -100, y: -100 });
  });

  test("pan groups split at a 100ms gap, retain raw precision, and close both curves at zero", () => {
    const events: IPlaygroundEvent[] = [
      { type: "tap", time: 4, x: 0.123456, y: 0.987654 },
      { type: "pan", time: 10, x: 0, y: 0 },
      { type: "pan", time: 109, x: 0.8, y: 0.6 },
      { type: "pan", time: 209, x: 0.2, y: 0.4 },
      { type: "pan", time: 220, x: 0, y: 0 },
    ];
    const pattern = recordedPattern(events);
    expect(pattern.discretePattern).toEqual([
      { time: 4, amplitude: 0.987654, frequency: 0.123456 },
    ]);
    expect(pattern.continuousPattern.amplitude).toEqual([
      { time: 10, value: 0 },
      { time: 109, value: 0.6 },
      { time: 109, value: 0 },
      { time: 209, value: 0.4 },
      { time: 220, value: 0 },
      { time: 220, value: 0 },
    ]);
    expect(pattern.continuousPattern.frequency.map((point) => point.value)).toEqual([
      0, 0.8, 0, 0.2, 0, 0,
    ]);
    expect(isPattern(pattern)).toBe(true);
  });

  test("native sharing keeps the source text payload and the recorder stops at twenty seconds", () => {
    const events: IPlaygroundEvent[] = [{ type: "tap", time: 123, x: 0.25, y: 0.75 }];
    expect(MAX_RECORDING_DURATION_MS).toBe(20000);
    expect(patternShareMessage(events)).toBe(
      `Pulsar custom preset\n\n${JSON.stringify({ discretePattern: [{ time: 123, amplitude: 0.75, frequency: 0.25 }], continuousPattern: { amplitude: [], frequency: [] } }, null, 2)}`,
    );
    expect(patternShareMessage([])).toBeNull();
    expect(playgroundTimer(true, false, 1234, 0)).toEqual({ label: "Recording", text: "1.2s" });
    expect(playgroundTimer(false, true, 1234, 2000)).toEqual({
      label: "Playing",
      text: "1.2s / 2.0s",
    });
    expect(playgroundTimer(false, false, 2000, 2000)).toEqual({ label: "Duration", text: "2.0s" });
  });
});
