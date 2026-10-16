import { expect, test } from "bun:test";
import {
  captureRhythmTap,
  recordedRhythm,
  recordingStats,
  type IRhythmRecording,
} from "../src/features/tools/rhythmRecording";
import { insertLibraryPattern } from "../src/features/presets/insertPattern";
import { emptyPattern } from "@buzzzz/core";

test("a monotonic recording starts at zero and keeps fractional offsets until insertion", () => {
  let recording: IRhythmRecording = { timestamps: [], limitReached: false };
  for (const timestamp of [0, 500.4, 1000.8]) recording = captureRhythmTap(recording, timestamp);
  expect(recording.timestamps).toEqual([0, 500.4, 1000.8]);
  expect(recordedRhythm(recording, 0.8, 0.5).discretePattern).toEqual([
    { time: 0, amplitude: 0.8, frequency: 0.5 },
    { time: 500.4, amplitude: 0.8, frequency: 0.5 },
    { time: 1000.8, amplitude: 0.8, frequency: 0.5 },
  ]);
});

test("insertion replaces the ceil-rounded raw interval before normalizing event times", () => {
  const current = {
    ...emptyPattern(),
    discretePattern: [
      { time: 351, amplitude: 0.1, frequency: 0.2 },
      { time: 352, amplitude: 0.2, frequency: 0.3 },
    ],
  };
  const incoming = recordedRhythm(
    { timestamps: [1000, 1100.4], limitReached: false },
    0.6436,
    0.2222,
  );
  const result = insertLibraryPattern(current, incoming, 250.1);
  expect(result.discretePattern).toEqual([
    { time: 250, amplitude: 0.6436, frequency: 0.2222 },
    { time: 350, amplitude: 0.6436, frequency: 0.2222 },
    { time: 352, amplitude: 0.2, frequency: 0.3 },
  ]);
  expect(current.discretePattern[0].time).toBe(351);
  expect(() => insertLibraryPattern(emptyPattern(), incoming, 59900)).toThrow("60 seconds");
});

test("tempo uses the full recording interval like Pulsar, including uneven gaps", () => {
  const recording = { timestamps: [10000, 10100, 11000, 11100], limitReached: false };
  expect(recordingStats(recording)).toEqual({ count: 4, durationMs: 1100, tempoBpm: 164 });
  expect(recordedRhythm(recording, 1, 0.3).discretePattern.map((tap) => tap.time)).toEqual([
    0, 100, 1000, 1100,
  ]);
});

test("invalid or backwards clock readings do not corrupt a take", () => {
  const recording = { timestamps: [100, 200], limitReached: false };
  for (const timestamp of [-1, Number.NaN, Infinity, 199])
    expect(captureRhythmTap(recording, timestamp)).toBe(recording);
});

test("recording limits preserve captured taps and permit an exact 60 second endpoint", () => {
  const start = { timestamps: [1000], limitReached: false };
  const endpoint = captureRhythmTap(start, 61000);
  expect(endpoint.timestamps).toEqual([1000, 61000]);
  expect(captureRhythmTap(endpoint, 61001)).toEqual({ ...endpoint, limitReached: true });
  const full = {
    timestamps: Array.from({ length: 1000 }, (_, index) => index),
    limitReached: false,
  };
  expect(captureRhythmTap(full, 1000)).toEqual({ ...full, limitReached: true });
  expect(start.timestamps).toEqual([1000]);
});
