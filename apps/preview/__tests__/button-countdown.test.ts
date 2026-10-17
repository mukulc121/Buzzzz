import { expect, test } from "bun:test";
import source from "./fixtures/button-countdown-source.json";
import { BUTTON_PATTERNS } from "../src/features/demos/controls/buttonPatterns";
import { COUNTDOWN_PATTERNS } from "../src/features/demos/timers/countdown";
import { createCountdownController } from "../src/features/demos/timers/countdownController";

test("button and timer patterns match the published IPA modules", () => {
  expect(BUTTON_PATTERNS).toEqual(source.buttons);
  expect(COUNTDOWN_PATTERNS).toEqual(source.countdown.patterns);
});

function countdown() {
  let tick = () => {};
  let canceled = 0;
  const calls: (keyof typeof COUNTDOWN_PATTERNS)[] = [];
  const controller = createCountdownController({
    play: (kind) => calls.push(kind),
    every: (callback) => {
      tick = callback;
      return () => {
        canceled++;
      };
    },
  });
  return { controller, calls, tick: () => tick(), staleTick: () => tick, canceled: () => canceled };
}

test("the published seven-second countdown starts silently and returns to idle after its double finish", () => {
  const run = countdown();
  run.controller.start();
  expect(run.controller.getSnapshot()).toEqual({
    kind: "running",
    remaining: source.countdown.seconds,
  });
  expect(run.calls).toEqual([]);
  for (let remaining = 6; remaining > 0; remaining--) {
    run.tick();
    expect(run.controller.getSnapshot()).toEqual({ kind: "running", remaining });
  }
  run.tick();
  expect(source.countdown.calls).toEqual(run.calls);
  expect(run.controller.getSnapshot()).toEqual({ kind: "idle" });
  expect(run.canceled()).toBe(1);
});

test("reset, restart, and disposal cancel old countdown callbacks", () => {
  const run = countdown();
  run.controller.start();
  const old = run.staleTick();
  run.controller.reset();
  old();
  expect(run.calls).toEqual([]);
  run.controller.start();
  old();
  run.tick();
  expect(run.calls).toEqual(["soft"]);
  const current = run.staleTick();
  run.controller.dispose();
  current();
  run.controller.start();
  expect(run.calls).toEqual(["soft"]);
  run.controller.activate();
  run.controller.start();
  run.tick();
  expect(run.calls).toEqual(["soft", "soft"]);
});
