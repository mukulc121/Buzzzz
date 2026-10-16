import { expect, test } from "bun:test";
import { isPattern, patternEnd } from "@buzzzz/core";
import { BEATS, TRACK_MS, beatPattern } from "../src/features/demos/audio/beats";
import { SAMPLE_RATE, encodeWav, synthesize } from "../src/features/demos/audio/wav";
import { BOUNCE_MS, bouncePattern, contactTaps } from "../src/features/demos/lottie/bounce";
import { tiltFeel } from "../src/features/demos/sensors/tilt";
import { STEPS, stepFeel, stepOf, valueAt } from "../src/features/demos/controls/slider";
import { doubleTap, heartbeat, rampUp } from "../src/features/demos/controls/buttonPatterns";
import { tickKind } from "../src/features/demos/timers/countdown";
import { DOT_COUNT, dotFeel, nextDot } from "../src/features/demos/timers/dots";
import {
  balloonScale,
  deflate,
  inflate,
  isPopped,
  stretchFeel,
} from "../src/features/demos/balloon/balloon";

test("bundled beat fixture is exactly what the generator produces", async () => {
  const fixture = new Uint8Array(
    await Bun.file(new URL("../src/features/demos/audio/beat.wav", import.meta.url)).arrayBuffer(),
  );
  expect(fixture).toEqual(new Uint8Array(encodeWav(synthesize())));
  const view = new DataView(fixture.buffer);
  expect(view.getUint32(24, true)).toBe(SAMPLE_RATE);
  expect(view.getUint32(40, true) / 2 / SAMPLE_RATE).toBe(TRACK_MS / 1000);
});

test("audio is loud on each beat and haptics tap at the same times", () => {
  const samples = synthesize();
  const peak = (ms: number) => {
    const at = Math.round((ms / 1000) * SAMPLE_RATE);
    return Math.max(...samples.subarray(at, at + 200).map(Math.abs));
  };
  for (const beat of BEATS) expect(peak(beat.time)).toBeGreaterThan(0.05);
  const pattern = beatPattern();
  expect(isPattern(pattern)).toBe(true);
  expect(pattern.discretePattern.map((tap) => tap.time)).toEqual(BEATS.map((b) => b.time));
  expect(patternEnd(pattern)).toBeLessThan(TRACK_MS);
});

test("lottie taps land on ground contacts and soften with each bounce", () => {
  const taps = contactTaps();
  expect(taps.map((tap) => tap.time)).toEqual([467, 1200, 1633, 1867]);
  expect(taps[0].amplitude).toBe(1);
  taps.slice(1).forEach((tap, i) => expect(tap.amplitude).toBeLessThan(taps[i].amplitude));
  expect(isPattern(bouncePattern())).toBe(true);
  expect(patternEnd(bouncePattern())).toBeLessThan(BOUNCE_MS);
});

test("tilt feel is silent at rest and grows with tilt or shake", () => {
  expect(tiltFeel({ x: 0, y: 0, z: -1 }).amplitude).toBe(0);
  const tilted = tiltFeel({ x: 0.7, y: 0, z: -0.7 });
  expect(tilted.amplitude).toBeGreaterThan(0);
  expect(tilted.frequency).toBeGreaterThan(tiltFeel({ x: 0, y: 0, z: -1 }).frequency);
  expect(tiltFeel({ x: 0, y: 0, z: -2.2 }).amplitude).toBe(1);
});

test("slider maps touch to clamped steps with rising feel", () => {
  expect(stepOf(valueAt(-20, 200))).toBe(0);
  expect(stepOf(valueAt(100, 200))).toBe(STEPS / 2);
  expect(stepOf(valueAt(500, 200))).toBe(STEPS);
  expect(valueAt(10, 0)).toBe(0);
  expect(stepFeel(STEPS).amplitude).toBeGreaterThan(stepFeel(0).amplitude);
});

test("button, countdown and dot patterns are valid and ordered", () => {
  for (const pattern of [doubleTap(), rampUp(), heartbeat()]) expect(isPattern(pattern)).toBe(true);
  expect([5, 4, 3, 1, 0].map(tickKind)).toEqual(["soft", "soft", "strong", "strong", "done"]);
  expect(Array.from({ length: DOT_COUNT + 1 }, (_, i) => i).reduce((i) => nextDot(i), 0)).toBe(1);
  expect(dotFeel(2).frequency).toBeGreaterThan(dotFeel(0).frequency);
});

test("balloon inflates to a pop and deflates back to rest", () => {
  let level = 0;
  for (let i = 0; i < 54; i++) level = inflate(level, 40);
  expect(isPopped(level)).toBe(false);
  for (let i = 0; i < 2; i++) level = inflate(level, 40);
  expect(isPopped(level)).toBe(true);
  expect(deflate(0.1, 1000)).toBe(0);
  expect(balloonScale(1)).toBeGreaterThan(balloonScale(0));
  expect(stretchFeel(1).amplitude).toBeGreaterThan(stretchFeel(0.5).amplitude);
});
