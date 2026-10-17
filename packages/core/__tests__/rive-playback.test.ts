import { expect, test } from "bun:test";
import { DEX_RIVE_CONFIG } from "../../../apps/studio/src/features/project/starter/rive/dex-rive-config.ts";
import { riveClock as clock } from "./fixtures/rive-clock.ts";

test("the source entry, repeating loop and exit follow the ViewModel phase boundaries", () => {
  const player = clock();
  const { haptics } = DEX_RIVE_CONFIG;
  player.trigger("hapticEntry", haptics.hapticEntry);
  player.advance(2200);
  expect(player.impacts).toEqual([
    { at: 600, preset: "impactSoft" },
    { at: 1800, preset: "impactLight" },
  ]);
  player.trigger("hapticLoop", haptics.hapticLoop);
  expect(player.impacts).toHaveLength(2);
  player.advance(1800);
  expect(player.impacts.slice(2)).toEqual([
    { at: 2200, preset: "impactSoft" },
    { at: 2360, preset: "impactSoft" },
    { at: 2560, preset: "impactSoft" },
    { at: 3800, preset: "impactSoft" },
    { at: 3960, preset: "impactSoft" },
  ]);
  player.trigger("hapticExit", haptics.hapticExit);
  expect(player.impacts.at(-1)).toEqual({ at: 4000, preset: "impactSoft" });
  player.trigger("hapticLoopStop", haptics.hapticLoopStop);
  player.advance(5000);
  expect(player.impacts.slice(7)).toEqual([
    { at: 4000, preset: "impactSoft" },
    { at: 4290, preset: "impactMedium" },
    { at: 4430, preset: "impactLight" },
  ]);
  expect(player.pending()).toBe(0);
});

test("the source loop-stop cue cancels only the still-active loop", () => {
  const player = clock();
  player.trigger("hapticLoop", DEX_RIVE_CONFIG.haptics.hapticLoop);
  player.advance(100);
  player.trigger("hapticLoopStop", DEX_RIVE_CONFIG.haptics.hapticLoopStop);
  player.advance(10000);
  expect(player.impacts).toEqual([{ at: 0, preset: "impactSoft" }]);
  expect(player.pending()).toBe(0);
});

test("a new phase invalidates old callbacks even after timer cancellation is too late", () => {
  const player = clock({ ignoreCancellation: true });
  player.trigger("hapticEntry", DEX_RIVE_CONFIG.haptics.hapticEntry);
  player.advance(300);
  player.trigger("hapticExit", DEX_RIVE_CONFIG.haptics.hapticExit);
  player.advance(3000);
  expect(player.impacts).toEqual([
    { at: 300, preset: "impactSoft" },
    { at: 590, preset: "impactMedium" },
    { at: 730, preset: "impactLight" },
  ]);
  expect(player.pending()).toBe(0);
});

test("immediate feedback happens once while scheduled cues repeat", () => {
  const player = clock();
  player.trigger("repeat", {
    kind: "sequence",
    immediate: "impactLight",
    cues: [{ delayMs: 0, preset: "impactSoft" }],
    repeatMs: 10,
  });
  expect(player.impacts).toEqual([{ at: 0, preset: "impactLight" }]);
  player.advance(21);
  expect(player.impacts).toEqual([
    { at: 0, preset: "impactLight" },
    { at: 0, preset: "impactSoft" },
    { at: 10, preset: "impactSoft" },
    { at: 20, preset: "impactSoft" },
  ]);
  player.stop();
  player.advance(100);
  expect(player.impacts).toHaveLength(4);
  expect(player.pending()).toBe(0);
});

test("disabled playback and lifecycle stop prevent delayed or repeating impacts", () => {
  const player = clock();
  player.setEnabled(false);
  player.trigger("hapticExit", DEX_RIVE_CONFIG.haptics.hapticExit);
  player.advance(1000);
  expect(player.impacts).toEqual([]);
  expect(player.pending()).toBe(0);
  player.setEnabled(true);
  player.trigger("hapticLoop", DEX_RIVE_CONFIG.haptics.hapticLoop);
  player.advance(0);
  player.setEnabled(false);
  player.advance(2000);
  expect(player.impacts).toEqual([{ at: 1000, preset: "impactSoft" }]);
  expect(player.pending()).toBe(0);
  player.setEnabled(true);
  player.trigger("hapticEntry", DEX_RIVE_CONFIG.haptics.hapticEntry);
  player.stop();
  player.advance(5000);
  expect(player.impacts).toHaveLength(1);
});
