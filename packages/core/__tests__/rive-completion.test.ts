import { expect, test } from "bun:test";
import { DEX_RIVE_CONFIG_1063 as DEX_RIVE_CONFIG } from "../../../apps/studio/src/features/project/starter/rive/dex-rive-config-1063.ts";
import { riveClock } from "./fixtures/rive-clock.ts";

const completion = { ...DEX_RIVE_CONFIG.completion, readyAfterMs: undefined };
const { haptics } = DEX_RIVE_CONFIG;

test.each([
  [0, 4440],
  [2199, 4440],
  [2200, 4440],
  [2500, 4440],
  [3799, 4440],
  [3800, 4440],
  [3801, 6040],
  [5000, 6040],
])("ready at %i follows the source exit deadline %i", (readyAt, deadline) => {
  const player = riveClock({ completion });
  player.trigger("hapticEntry");
  player.advance(readyAt);
  player.trigger("isLoaded");
  player.advance(deadline - readyAt - 1);
  expect(player.completions).toEqual([]);
  player.advance(1);
  expect(player.completions).toEqual([deadline]);
});

test("automatic readiness fires the real ViewModel trigger and waits for its observed callback", () => {
  const player = riveClock({ completion: DEX_RIVE_CONFIG.completion });
  player.trigger("hapticEntry");
  player.advance(2499);
  expect(player.fired).toEqual([]);
  player.advance(1);
  expect(player.fired).toEqual([{ at: 2500, name: "isLoaded" }]);
  player.advance(1940);
  expect(player.completions).toEqual([]);
  player.trigger("isLoaded");
  player.advance(1599);
  expect(player.completions).toEqual([]);
  player.advance(1);
  expect(player.completions).toEqual([6040]);
});

test("missing terminal Rive events still finish without fabricating an exit impact", () => {
  const player = riveClock({ completion: DEX_RIVE_CONFIG.completion });
  player.trigger("hapticEntry", haptics.hapticEntry);
  player.advance(2200);
  player.trigger("hapticLoop", haptics.hapticLoop);
  player.advance(300);
  expect(player.fired).toEqual([{ at: 2500, name: "isLoaded" }]);
  player.trigger("isLoaded");
  player.advance(1940);
  expect(player.completions).toEqual([4440]);
  expect(player.impacts).toEqual([
    { at: 600, preset: "impactSoft" },
    { at: 1800, preset: "impactLight" },
    { at: 2200, preset: "impactSoft" },
    { at: 2360, preset: "impactSoft" },
    { at: 2560, preset: "impactSoft" },
    { at: 3800, preset: "impactSoft" },
    { at: 3960, preset: "impactSoft" },
    { at: 4160, preset: "impactSoft" },
  ]);
  player.trigger("hapticExit", haptics.hapticExit);
  player.trigger("hapticLoop", haptics.hapticLoop);
  player.advance(10000);
  expect(player.impacts).toHaveLength(8);
  expect(player.completions).toEqual([4440]);
  expect(player.pending()).toBe(0);
});

test("early actual readiness latches until entry and cancels automatic readiness", () => {
  const player = riveClock({ completion: DEX_RIVE_CONFIG.completion });
  player.trigger("isLoaded");
  player.advance(500);
  player.trigger("hapticEntry");
  player.advance(4439);
  expect(player.fired).toEqual([]);
  expect(player.completions).toEqual([]);
  player.advance(1);
  expect(player.completions).toEqual([4940]);
});

test("duplicate readiness, phase changes and late loop-stop cannot reset scene completion", () => {
  const player = riveClock({ completion: DEX_RIVE_CONFIG.completion });
  player.trigger("hapticEntry");
  player.advance(1000);
  player.trigger("isLoaded");
  player.advance(1200);
  player.trigger("hapticLoop", haptics.hapticLoop);
  player.advance(1300);
  player.trigger("isLoaded");
  player.trigger("hapticEntry");
  player.trigger("hapticExit", haptics.hapticExit);
  player.trigger("hapticLoopStop", haptics.hapticLoopStop);
  player.advance(940);
  expect(player.completions).toEqual([4440]);
  expect(player.fired).toEqual([]);
  expect(player.impacts.at(-1)).toEqual({ at: 3930, preset: "impactLight" });
});

test("missing entry or readiness never invents a scene epoch or acknowledgement", () => {
  const missingEntry = riveClock({ completion: DEX_RIVE_CONFIG.completion });
  missingEntry.trigger("isLoaded");
  missingEntry.advance(100000);
  expect(missingEntry.completions).toEqual([]);
  expect(missingEntry.fired).toEqual([]);
  const missingReady = riveClock({ completion });
  missingReady.trigger("hapticEntry");
  missingReady.advance(100000);
  expect(missingReady.completions).toEqual([]);
});

test("full reset suppresses stale readiness and completion callbacks before a new scene", () => {
  const player = riveClock({
    completion: DEX_RIVE_CONFIG.completion,
    ignoreCancellation: true,
  });
  player.trigger("hapticEntry", haptics.hapticEntry);
  player.advance(1000);
  player.trigger("isLoaded");
  player.stop();
  player.trigger("hapticEntry");
  player.trigger("isLoaded");
  player.advance(4439);
  expect(player.completions).toEqual([]);
  expect(player.fired).toEqual([]);
  expect(player.impacts).toEqual([{ at: 600, preset: "impactSoft" }]);
  player.advance(1);
  expect(player.completions).toEqual([5440]);
});

test("reset before automatic readiness drops both the phase and ready timer", () => {
  const player = riveClock({
    completion: DEX_RIVE_CONFIG.completion,
    ignoreCancellation: true,
  });
  player.trigger("hapticEntry", haptics.hapticEntry);
  player.advance(300);
  player.stop();
  player.advance(10000);
  expect(player.fired).toEqual([]);
  expect(player.completions).toEqual([]);
  expect(player.impacts).toEqual([]);
});
