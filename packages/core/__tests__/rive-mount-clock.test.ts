import { expect, test } from "bun:test";
import { DEX_RIVE_CONFIG_1063 as DEX_RIVE_CONFIG } from "../../../apps/studio/src/features/project/starter/rive/dex-rive-config-1063.ts";
import source from "./fixtures/dex-mount-clock.json";
import { riveClock } from "./fixtures/rive-clock.ts";

test.each(source.vectors)(
  "Dex mount clock follows source with binding at $boundAt ms",
  (vector) => {
    const player = riveClock({ completion: DEX_RIVE_CONFIG.completion });
    player.mount();
    player.advance(vector.boundAt);
    expect(player.fired).toEqual([]);
    player.bind();
    let now = vector.boundAt;
    for (const event of [
      { at: vector.entryAt, name: "hapticEntry" },
      { at: vector.readyAt, name: "isLoaded" },
    ].sort((a, b) => a.at - b.at)) {
      player.advance(event.at - now);
      player.trigger(event.name);
      now = event.at;
    }
    expect(player.fired).toEqual([{ at: vector.readyAt, name: "isLoaded" }]);
    player.advance(vector.completeAt - now - 1);
    expect(player.completions).toEqual([]);
    player.advance(1);
    expect(player.completions).toEqual([vector.completeAt]);
  },
);

test("mount latency no longer adds the loop beats Dex cancels", () => {
  const player = riveClock({ completion: DEX_RIVE_CONFIG.completion });
  player.mount();
  player.advance(500);
  player.bind();
  player.trigger("hapticEntry", DEX_RIVE_CONFIG.haptics.hapticEntry);
  player.advance(2000);
  player.trigger("isLoaded");
  player.advance(200);
  player.trigger("hapticLoop", DEX_RIVE_CONFIG.haptics.hapticLoop);
  player.advance(2240);
  expect(player.impacts).toEqual([
    { at: 1100, preset: "impactSoft" },
    { at: 2300, preset: "impactLight" },
    { at: 2700, preset: "impactSoft" },
    { at: 2860, preset: "impactSoft" },
    { at: 3060, preset: "impactSoft" },
    { at: 4300, preset: "impactSoft" },
  ]);
  expect(player.completions).toEqual([4440]);
});

test("mount readiness waits for binding and repeated binding does not refire it", () => {
  const player = riveClock({ completion: DEX_RIVE_CONFIG.completion });
  player.mount();
  player.advance(3000);
  expect(player.fired).toEqual([]);
  player.bind();
  player.advance(0);
  expect(player.fired).toEqual([{ at: 3000, name: "isLoaded" }]);
  player.bind();
  player.advance(1000);
  expect(player.fired).toHaveLength(1);
  expect(player.completions).toEqual([]);
});

test("manual readiness cancels the automatic request before entry", () => {
  const player = riveClock({ completion: DEX_RIVE_CONFIG.completion });
  player.mount();
  player.advance(500);
  player.bind();
  player.trigger("isLoaded");
  player.advance(500);
  player.trigger("hapticEntry");
  player.advance(3440);
  expect(player.fired).toEqual([]);
  expect(player.completions).toEqual([4440]);
});

test("manual pause excludes suspended time from the mount deadline", () => {
  const player = riveClock({ completion: DEX_RIVE_CONFIG.completion });
  player.mount();
  player.advance(500);
  player.bind();
  player.trigger("hapticEntry");
  player.advance(500);
  player.pause();
  player.advance(3000);
  player.resume();
  player.advance(1500);
  expect(player.fired).toEqual([{ at: 5500, name: "isLoaded" }]);
  player.trigger("isLoaded");
  player.advance(1940);
  expect(player.completions).toEqual([7440]);
});

test("binding an inactive scene preserves its paused mount clock until foreground", () => {
  const player = riveClock({ completion: DEX_RIVE_CONFIG.completion });
  player.mount();
  player.advance(500);
  player.pause();
  player.advance(1000);
  player.bind();
  player.advance(2000);
  expect(player.fired).toEqual([]);
  player.resume();
  player.advance(1999);
  expect(player.fired).toEqual([]);
  player.advance(1);
  expect(player.fired).toEqual([{ at: 5500, name: "isLoaded" }]);
  player.trigger("isLoaded");
  player.advance(1940);
  expect(player.completions).toEqual([7440]);
});

test("a mapped pattern can replace scripted impacts without resetting scene readiness", () => {
  const player = riveClock({ completion: DEX_RIVE_CONFIG.completion });
  player.mount();
  player.bind();
  player.trigger("hapticEntry", DEX_RIVE_CONFIG.haptics.hapticEntry);
  player.advance(300);
  player.stopImpacts();
  player.advance(2200);
  expect(player.fired).toEqual([{ at: 2500, name: "isLoaded" }]);
  player.trigger("isLoaded");
  player.advance(1940);
  expect(player.completions).toEqual([4440]);
  expect(player.impacts).toEqual([]);
});

test("scene replacement drops old deadlines even if canceled callbacks still run", () => {
  const player = riveClock({ completion: DEX_RIVE_CONFIG.completion, ignoreCancellation: true });
  player.mount();
  player.bind();
  player.advance(1000);
  player.mount();
  player.bind();
  player.advance(2499);
  expect(player.fired).toEqual([]);
  player.advance(1);
  expect(player.fired).toEqual([{ at: 3500, name: "isLoaded" }]);
  player.trigger("isLoaded");
  player.advance(1940);
  expect(player.completions).toEqual([5440]);
});

test("generic completion keeps the trigger epoch even when adapters report mount and binding", () => {
  const { clock: _clock, ...completion } = DEX_RIVE_CONFIG.completion;
  const player = riveClock({ completion });
  player.mount();
  player.bind();
  player.advance(500);
  player.trigger("hapticEntry");
  player.advance(2500);
  expect(player.fired).toEqual([{ at: 3000, name: "isLoaded" }]);
  player.trigger("isLoaded");
  player.advance(1940);
  expect(player.completions).toEqual([4940]);
});

test("elapsed time shares the paused scene clock, latches on completion and clears on stop", () => {
  const player = riveClock({ completion: DEX_RIVE_CONFIG.completion });
  expect(player.elapsedMs()).toBeNull();
  player.mount();
  expect(player.elapsedMs()).toBe(0);
  player.advance(500);
  expect(player.elapsedMs()).toBe(500);
  player.bind();
  player.pause();
  player.advance(3000);
  expect(player.elapsedMs()).toBe(500);
  player.resume();
  player.advance(2000);
  expect(player.elapsedMs()).toBe(2500);
  player.trigger("isLoaded");
  player.advance(1940);
  expect(player.elapsedMs()).toBe(4440);
  player.advance(10000);
  expect(player.elapsedMs()).toBe(4440);
  player.pause();
  player.advance(1000);
  player.resume();
  expect(player.elapsedMs()).toBe(4440);
  player.stop();
  expect(player.elapsedMs()).toBeNull();
  player.mount();
  expect(player.elapsedMs()).toBe(0);
});
