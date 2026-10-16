import { expect, test } from "bun:test";
import { emptyPattern, type Pattern } from "@buzzzz/core";
import { cachePattern } from "../src/features/sessionLibrary/patterns";
import { patternStartingAt } from "../src/features/sessionLibrary/patternStartingAt";
import { createReceivedPlayback } from "../src/features/sessionLibrary/receivedPlayback";

const pattern: Pattern = {
  discretePattern: [
    { time: 100, amplitude: 0.8, frequency: 0.3 },
    { time: 400, amplitude: 0.5, frequency: 0.7 },
    { time: 1000, amplitude: 1, frequency: 0.5 },
  ],
  continuousPattern: {
    amplitude: [
      { time: 100, value: 0.2 },
      { time: 500, value: 1 },
    ],
    frequency: [
      { time: 0, value: 0.8 },
      { time: 1000, value: 0.2 },
    ],
  },
};

function runtime() {
  let time = 0;
  let nextId = 0;
  const frames = new Map<number, () => void>();
  const calls: string[] = [];
  const parsed: Pattern[] = [];
  const options = {
    composer: {
      stop: () => {
        calls.push("stop");
      },
      parse: (value: Pattern) => {
        calls.push("parse");
        parsed.push(value);
      },
      play: () => {
        calls.push("play");
      },
    },
    now: () => time,
    requestFrame: (callback: () => void) => {
      frames.set(++nextId, callback);
      return nextId;
    },
    cancelFrame: (id: number) => {
      frames.delete(id);
    },
    onPlay: () => {
      calls.push("claim");
    },
  };
  return {
    options,
    calls,
    parsed,
    frames,
    tick: (at: number) => {
      time = at;
      const pending = [...frames.values()];
      frames.clear();
      for (const callback of pending) callback();
    },
  };
}

const record = cachePattern(
  {},
  "studio",
  { resourceId: "hit", name: "Hit", version: "a".repeat(64), pattern },
  1,
).studio[0];

test("published native seek semantics interpolate the boundary and hold an exhausted envelope", () => {
  expect(patternStartingAt(pattern, 0)).toBe(pattern);
  const sought = patternStartingAt(pattern, 300);
  expect(sought.discretePattern).toEqual([
    { time: 100, amplitude: 0.5, frequency: 0.7 },
    { time: 700, amplitude: 1, frequency: 0.5 },
  ]);
  expect(sought.continuousPattern.amplitude).toEqual([
    { time: 0, value: expect.closeTo(0.6, 12) },
    { time: 200, value: 1 },
  ]);
  expect(sought.continuousPattern.frequency[0].value).toBeCloseTo(0.62, 12);
  expect(patternStartingAt(pattern, 600).continuousPattern.amplitude).toEqual([
    { time: 0, value: 1 },
    { time: 400, value: 1 },
  ]);
  expect(patternStartingAt(pattern, 50).continuousPattern.amplitude).toEqual([
    { time: 0, value: 0.2 },
    { time: 50, value: 0.2 },
    { time: 450, value: 1 },
  ]);
  expect(patternStartingAt(pattern, 1000).discretePattern).toEqual([
    { time: 0, amplitude: 1, frequency: 0.5 },
  ]);
  expect(patternStartingAt(emptyPattern(), 20)).toEqual(emptyPattern());
});

test("pause preserves position, paused seeking is silent and resume reparses the remaining pattern", () => {
  const native = runtime();
  const playback = createReceivedPlayback(native.options);
  playback.start("studio", record);
  expect(native.calls).toEqual(["claim", "stop", "parse", "play"]);
  native.tick(300);
  playback.togglePlay();
  expect(playback.getSnapshot()).toMatchObject({ playing: false, positionMs: 300 });
  const calls = native.calls.length;
  playback.seek(600);
  expect(native.calls).toHaveLength(calls);
  expect(playback.getSnapshot().positionMs).toBe(600);
  playback.togglePlay();
  expect(native.parsed.at(-1)).toEqual(patternStartingAt(pattern, 600));
  native.tick(700);
  expect(playback.getSnapshot()).toMatchObject({
    playing: false,
    positionMs: 1000,
    active: { connectionId: "studio", record },
  });
  expect(native.calls.at(-1)).toBe("play");
  playback.togglePlay();
  expect(native.parsed.at(-1)).toEqual(pattern);
  expect(playback.getSnapshot()).toMatchObject({ playing: true, positionMs: 0 });
  playback.stop();
  expect(playback.getSnapshot()).toMatchObject({
    playing: false,
    positionMs: 0,
    active: { record },
  });
});

test("scrubbing only previews a position and a committed playing seek restarts native playback", () => {
  const native = runtime();
  const playback = createReceivedPlayback(native.options);
  playback.start("studio", record);
  native.tick(100);
  playback.scrub(800);
  native.tick(200);
  expect(playback.getSnapshot()).toMatchObject({ playing: true, positionMs: 800 });
  expect(native.parsed).toHaveLength(1);
  playback.scrub(null);
  expect(playback.getSnapshot().positionMs).toBe(200);
  playback.seek(400);
  expect(native.parsed.at(-1)).toEqual(patternStartingAt(pattern, 400));
  native.tick(300);
  expect(playback.getSnapshot()).toMatchObject({ playing: true, positionMs: 500 });
  playback.seek(Number.NaN);
  expect(playback.getSnapshot().positionMs).toBe(500);
  playback.dismiss();
  expect(playback.getSnapshot()).toMatchObject({ active: null, playing: false, positionMs: 0 });
});

test("stale clocks and cleanup cannot resume or stop a released native owner", () => {
  const native = runtime();
  const playback = createReceivedPlayback(native.options);
  playback.start("studio", record);
  const staleTick = [...native.frames.values()][0];
  playback.stop();
  const calls = [...native.calls];
  playback.dispose();
  staleTick();
  playback.togglePlay();
  expect(native.calls).toEqual(calls);
  expect(playback.getSnapshot()).toMatchObject({ playing: false, positionMs: 0 });
  playback.activate();
  playback.setOnPlay(() => {
    native.calls.push("new claim");
  });
  playback.togglePlay();
  expect(native.calls.slice(-4)).toEqual(["new claim", "stop", "parse", "play"]);
});

test("native parse failures keep the received resource replayable and expose the real error", () => {
  const native = runtime();
  native.options.composer.parse = () => {
    throw new Error("Native parse failed");
  };
  const playback = createReceivedPlayback(native.options);
  playback.start("studio", record);
  expect(playback.getSnapshot()).toMatchObject({
    active: { record },
    playing: false,
    error: "Native parse failed",
  });
  expect(native.calls).toEqual(["claim", "stop"]);
  expect(native.frames.size).toBe(0);
});

test("a failing native play releases only its own output and cleanup reports stop failures", () => {
  const native = runtime();
  native.options.composer.play = () => {
    throw new Error("Native play failed");
  };
  const playback = createReceivedPlayback(native.options);
  playback.start("studio", record);
  expect(playback.getSnapshot()).toMatchObject({ playing: false, error: "Native play failed" });
  expect(native.calls).toEqual(["claim", "stop", "parse", "stop"]);
  playback.dispose();
  expect(native.calls).toHaveLength(4);
  playback.activate();
  native.options.composer.play = () => {};
  playback.togglePlay();
  native.options.composer.stop = () => {
    throw new Error("Native stop failed");
  };
  expect(() => playback.dispose()).not.toThrow();
  expect(playback.getSnapshot()).toMatchObject({ playing: false, error: "Native stop failed" });
});
