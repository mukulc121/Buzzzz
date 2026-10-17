import { expect, test } from "bun:test";
import { DEX_RIVE_CONFIG_1063 as DEX_RIVE_CONFIG } from "../../../apps/studio/src/features/project/starter/rive/dex-rive-config-1063.ts";
import { riveClock } from "./fixtures/rive-clock.ts";

const { haptics, completion } = DEX_RIVE_CONFIG;

test("entry resumes remaining cue delays rather than restarting or running a backlog", () => {
  const player = riveClock();
  player.trigger("hapticEntry", haptics.hapticEntry);
  player.advance(300);
  player.pause();
  player.advance(5000);
  expect(player.impacts).toEqual([]);
  player.resume();
  player.advance(299);
  expect(player.impacts).toEqual([]);
  player.advance(1201);
  expect(player.impacts).toEqual([
    { at: 5600, preset: "impactSoft" },
    { at: 6800, preset: "impactLight" },
  ]);
});

test("loop resume preserves the remaining pulse and repeat delays", () => {
  const player = riveClock();
  player.trigger("hapticLoop", haptics.hapticLoop);
  player.advance(100);
  player.pause();
  player.advance(5000);
  player.resume();
  player.advance(1500);
  expect(player.impacts).toEqual([
    { at: 0, preset: "impactSoft" },
    { at: 5160, preset: "impactSoft" },
    { at: 5360, preset: "impactSoft" },
    { at: 6600, preset: "impactSoft" },
  ]);
});

test("automatic readiness and the scene clock both exclude paused time", () => {
  const player = riveClock({ completion });
  player.trigger("hapticEntry");
  player.advance(1000);
  player.pause();
  player.advance(5000);
  expect(player.fired).toEqual([]);
  player.resume();
  player.advance(1499);
  expect(player.fired).toEqual([]);
  player.advance(1);
  expect(player.fired).toEqual([{ at: 7500, name: "isLoaded" }]);
  player.trigger("isLoaded");
  player.advance(1939);
  expect(player.completions).toEqual([]);
  player.advance(1);
  expect(player.completions).toEqual([9440]);
});

test("an armed completion resumes only its remaining delay", () => {
  const player = riveClock({ completion });
  player.trigger("hapticEntry");
  player.advance(2500);
  player.trigger("isLoaded");
  player.advance(500);
  player.pause();
  player.advance(5000);
  player.resume();
  player.advance(1439);
  expect(player.completions).toEqual([]);
  player.advance(1);
  expect(player.completions).toEqual([9440]);
  expect(player.pending()).toBe(0);
});

test("repeated pause and resume ignore already queued platform callbacks", () => {
  const player = riveClock({ completion, ignoreCancellation: true });
  player.trigger("hapticEntry", haptics.hapticEntry);
  player.advance(300);
  player.pause();
  player.pause();
  player.advance(5000);
  player.resume();
  player.resume();
  player.advance(300);
  player.pause();
  player.advance(1000);
  player.resume();
  player.advance(1900);
  expect(player.impacts).toEqual([
    { at: 5600, preset: "impactSoft" },
    { at: 7800, preset: "impactLight" },
  ]);
  expect(player.fired).toEqual([{ at: 8500, name: "isLoaded" }]);
  player.trigger("isLoaded");
  player.advance(1940);
  expect(player.completions).toEqual([10440]);
  expect(player.pending()).toBe(0);
});

test("stop while paused drops cues, readiness and completion, then starts a fresh clock", () => {
  const player = riveClock({ completion, ignoreCancellation: true });
  player.trigger("hapticEntry", haptics.hapticEntry);
  player.advance(300);
  player.pause();
  player.advance(5000);
  player.stop();
  player.resume();
  player.advance(10000);
  expect(player.impacts).toEqual([]);
  expect(player.fired).toEqual([]);
  expect(player.completions).toEqual([]);
  player.trigger("hapticEntry");
  player.trigger("isLoaded");
  player.advance(4440);
  expect(player.completions).toEqual([19740]);
});

test("an immediate impact is not replayed by resume", () => {
  const player = riveClock();
  player.trigger("hapticExit", haptics.hapticExit);
  player.advance(100);
  player.pause();
  player.advance(2000);
  player.resume();
  player.advance(330);
  expect(player.impacts).toEqual([
    { at: 0, preset: "impactSoft" },
    { at: 2290, preset: "impactMedium" },
    { at: 2430, preset: "impactLight" },
  ]);
});

test("queued ViewModel callbacks while paused cannot replace the frozen phase or play an impact", () => {
  const player = riveClock();
  player.trigger("hapticEntry", haptics.hapticEntry);
  player.advance(300);
  player.pause();
  player.trigger("hapticExit", haptics.hapticExit);
  player.trigger("hapticLoopStop", haptics.hapticLoopStop);
  player.advance(5000);
  expect(player.impacts).toEqual([]);
  player.resume();
  player.advance(1500);
  expect(player.impacts).toEqual([
    { at: 5600, preset: "impactSoft" },
    { at: 6800, preset: "impactLight" },
  ]);
});

test("paused entry and ready callbacks never establish an unobserved running scene", () => {
  const player = riveClock({ completion });
  player.pause();
  player.trigger("hapticEntry", haptics.hapticEntry);
  player.trigger("isLoaded");
  player.advance(1000);
  player.resume();
  player.advance(10000);
  expect(player.impacts).toEqual([]);
  expect(player.fired).toEqual([]);
  expect(player.completions).toEqual([]);
  player.trigger("hapticEntry");
  player.advance(2500);
  expect(player.fired).toEqual([{ at: 13500, name: "isLoaded" }]);
  player.trigger("isLoaded");
  player.advance(1940);
  expect(player.completions).toEqual([15440]);
});

test("local finish and resume retain the terminal lock until an explicit scene reset", () => {
  const player = riveClock({ completion });
  expect(player.completed()).toBe(false);
  player.trigger("hapticEntry");
  player.trigger("isLoaded");
  player.advance(4440);
  expect(player.completed()).toBe(true);
  player.pause();
  player.trigger("hapticExit", haptics.hapticExit);
  player.resume();
  player.trigger("hapticLoop", haptics.hapticLoop);
  player.advance(10000);
  expect(player.completed()).toBe(true);
  expect(player.impacts).toEqual([]);
  expect(player.completions).toEqual([4440]);
  player.stop();
  expect(player.completed()).toBe(false);
  player.trigger("hapticExit", haptics.hapticExit);
  expect(player.impacts).toEqual([{ at: 14440, preset: "impactSoft" }]);
});
