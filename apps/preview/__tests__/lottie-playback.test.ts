import { expect, test } from "bun:test";
import type { Pattern } from "react-native-pulsar";
import { createLottiePlayback } from "../src/features/demos/lottie/lottiePlayback";

const pattern: Pattern = {
  continuousPattern: {
    amplitude: [
      { time: 0, value: 0.2 },
      { time: 100, value: 1 },
    ],
    frequency: [
      { time: 0, value: 0.8 },
      { time: 100, value: 0.4 },
    ],
  },
  discretePattern: [],
};

function session() {
  const calls: string[] = [];
  const levels: number[][] = [];
  let draggedMs: number | null = null;
  const clock = {
    positionMs: 0,
    isRunning: false,
    start: (timeMs: number) => {
      calls.push(`start:${timeMs}`);
      clock.positionMs = timeMs;
      clock.isRunning = true;
    },
    stop: () => {
      calls.push("clock-stop");
      clock.isRunning = false;
    },
    jumpTo: (timeMs: number) => {
      calls.push(`jump:${timeMs}`);
      clock.positionMs = timeMs;
      clock.isRunning = false;
    },
  };
  const controller = createLottiePlayback({
    durationMs: 100,
    pattern,
  });
  const bindings = {
    view: {
      setTimestamp: (timeMs: number) => {
        calls.push(`timestamp:${timeMs}`);
      },
      pause: () => {
        calls.push("pause");
      },
      resume: () => {
        calls.push("resume");
      },
    },
    clock,
    realtime: {
      set: (amplitude: number, frequency: number) => {
        levels.push([amplitude, frequency]);
      },
      stop: () => {
        calls.push("realtime-stop");
      },
    },
    onScrub: (timeMs: number | null) => {
      draggedMs = timeMs;
    },
  };
  controller.connect(bindings);
  return { controller, clock, calls, levels, bindings, draggedMs: () => draggedMs };
}

test("Lottie transport resumes from its position and replays from zero after completion", () => {
  const run = session();
  run.clock.positionMs = 25;
  run.controller.toggle();
  expect(run.calls).toEqual(["timestamp:25", "resume", "start:25"]);
  run.controller.toggle();
  expect(run.calls.slice(-2)).toEqual(["pause", "clock-stop"]);
  run.clock.positionMs = 100;
  run.controller.toggle();
  expect(run.calls.slice(-3)).toEqual(["timestamp:0", "resume", "start:0"]);
});

test("paused scrubbing samples haptics and seeks without starting playback", () => {
  const run = session();
  run.controller.scrub(25);
  run.controller.scrub(50);
  expect(run.calls).toEqual(["pause", "clock-stop", "timestamp:25", "timestamp:50"]);
  expect(run.levels[0][0]).toBeCloseTo(0.4);
  expect(run.levels[0][1]).toBeCloseTo(0.7);
  expect(run.levels[1][0]).toBeCloseTo(0.6);
  expect(run.draggedMs()).toBe(50);
  run.controller.scrub(null);
  run.controller.seek(50);
  expect(run.draggedMs()).toBeNull();
  expect(run.clock.positionMs).toBe(50);
  expect(run.clock.isRunning).toBe(false);
  expect(run.calls.slice(-4)).toEqual([
    "realtime-stop",
    "realtime-stop",
    "timestamp:50",
    "jump:50",
  ]);
});

test("scrub completion resumes a previously running animation after clearing drag state", () => {
  const run = session();
  run.controller.toggle();
  run.controller.scrub(50);
  expect(run.clock.isRunning).toBe(false);
  run.controller.scrub(null);
  run.controller.seek(50);
  expect(run.clock.isRunning).toBe(true);
  expect(run.calls.slice(-4)).toEqual(["realtime-stop", "timestamp:50", "resume", "start:50"]);
});

test("unmount stops preview haptics and rejects stale transport operations", () => {
  const run = session();
  run.controller.scrub(10);
  run.controller.dispose();
  const calls = [...run.calls];
  run.controller.toggle();
  run.controller.seek(80);
  run.controller.scrub(90);
  expect(run.calls).toEqual(calls);
  expect(run.calls.slice(-2)).toEqual(["pause", "realtime-stop"]);
  expect(run.levels).toHaveLength(1);
  run.controller.activate();
  run.controller.connect(run.bindings);
  run.controller.toggle();
  expect(run.clock.isRunning).toBe(true);
});
