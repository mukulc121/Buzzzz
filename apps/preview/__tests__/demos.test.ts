import { expect, test } from "bun:test";
import { isPattern, patternEnd } from "@buzzzz/core";
import { BEATS, TRACK_MS, beatPattern } from "../src/features/demos/audio/beats";
import { SAMPLE_RATE, encodeWav, synthesize } from "../src/features/demos/audio/wav";
import { BOUNCE_MS, bouncePattern, contactTaps } from "../src/features/demos/lottie/bounce";
import { BUTTON_PATTERNS } from "../src/features/demos/controls/buttonPatterns";
import { tickKind } from "../src/features/demos/timers/countdown";

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

test("button and countdown patterns are valid and ordered", () => {
  for (const entry of BUTTON_PATTERNS) expect(isPattern(entry.pattern)).toBe(true);
  expect([5, 4, 3, 2, 1, 0].map(tickKind)).toEqual([
    "soft",
    "soft",
    "soft",
    "strong",
    "strong",
    "done",
  ]);
});
