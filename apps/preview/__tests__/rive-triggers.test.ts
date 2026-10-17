import { expect, test } from "bun:test";
import { createRiveHaptics } from "@buzzzz/core";
import { bindRiveTriggers } from "../src/features/playback/riveTriggers";

function scene() {
  const callbacks = new Map<string, () => void>();
  const disposed: string[] = [];
  const triggered: string[] = [];
  const fired: string[] = [];
  const subscribed: string[] = [];
  const source = {
    getPropertiesAsync: async () => [
      { name: "hapticEntry", type: "trigger" },
      { name: "title", type: "string" },
      { name: "isLoaded", type: "trigger" },
    ],
    triggerProperty: (name: string) => ({
      trigger: () => triggered.push(name),
      addListener: (callback: () => void) => {
        subscribed.push(name);
        callbacks.set(name, callback);
        return () => callbacks.delete(name);
      },
      dispose: () => disposed.push(name),
    }),
  };
  return { source, fired, callbacks, triggered, subscribed, disposed };
}

test("Rive binding is ready only after every trigger listener is installed on its source instance", async () => {
  const data = scene();
  let release = () => {};
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  const controller = new AbortController();
  const binding = bindRiveTriggers({
    source: {
      ...data.source,
      getPropertiesAsync: async () => {
        await pending;
        return data.source.getPropertiesAsync();
      },
    },
    canDispatch: () => true,
    signal: controller.signal,
    onTrigger: (name) => data.fired.push(name),
  });
  expect(data.subscribed).toEqual([]);
  release();
  const ready = await binding;
  expect(ready.names).toEqual(["hapticEntry", "isLoaded"]);
  expect(data.subscribed).toEqual(ready.names);
  data.callbacks.get("hapticEntry")?.();
  expect(data.fired).toEqual(["hapticEntry"]);
  ready.fire("isLoaded");
  expect(data.triggered).toEqual(["isLoaded"]);
  controller.abort();
  expect(data.callbacks.size).toBe(0);
  expect(data.disposed).toEqual(["hapticEntry", "isLoaded"]);
  ready.fire("isLoaded");
  expect(data.triggered).toEqual(["isLoaded"]);
});

test("a replaced scene never subscribes when its pending native property enumeration finishes", async () => {
  const data = scene();
  let release = () => {};
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  const controller = new AbortController();
  const binding = bindRiveTriggers({
    source: {
      ...data.source,
      getPropertiesAsync: async () => {
        await pending;
        return data.source.getPropertiesAsync();
      },
    },
    canDispatch: () => true,
    signal: controller.signal,
    onTrigger: (name) => data.fired.push(name),
  });
  controller.abort();
  release();
  await expect(binding).rejects.toThrow("aborted");
  expect(data.subscribed).toEqual([]);
});

test("late native callbacks are ignored after scene cleanup and partial binding failures release handles", async () => {
  const data = scene();
  const controller = new AbortController();
  await bindRiveTriggers({
    source: data.source,
    canDispatch: () => true,
    signal: controller.signal,
    onTrigger: (name) => data.fired.push(name),
  });
  const late = data.callbacks.get("hapticEntry");
  controller.abort();
  late?.();
  expect(data.fired).toEqual([]);
  const failure = new AbortController();
  await expect(
    bindRiveTriggers({
      source: {
        ...data.source,
        triggerProperty: (name) => {
          if (name === "isLoaded") throw new Error("Native property unavailable");
          return data.source.triggerProperty(name);
        },
      },
      canDispatch: () => true,
      signal: failure.signal,
      onTrigger: (name) => data.fired.push(name),
    }),
  ).rejects.toThrow("Native property unavailable");
  expect(data.callbacks.size).toBe(0);
  expect(data.disposed).toEqual(["hapticEntry", "isLoaded", "hapticEntry"]);
});

test("automatic readiness fires the bound VM and waits for its real callback before completing", async () => {
  const data = scene();
  const controller = new AbortController();
  let now = 0;
  const timers = new Map<number, { callback: () => void; delayMs: number }>();
  const paused: boolean[] = [];
  const fire = { current: (_name: string) => {} };
  let nextTimer = 0;
  const player = createRiveHaptics({
    play: () => {
      throw new Error("Ready completion must not synthesize a haptic");
    },
    canPlay: () => true,
    now: () => now,
    schedule: (callback, delayMs) => {
      const timer = ++nextTimer;
      timers.set(timer, { callback, delayMs });
      return timer;
    },
    cancel: (timer) => {
      timers.delete(timer);
    },
    completion: {
      startTrigger: "hapticEntry",
      readyTrigger: "isLoaded",
      entryMs: 2200,
      loopPeriodMs: 1600,
      exitMs: 560,
      marginMs: 80,
      readyAfterMs: 2500,
    },
    fireTrigger: (name) => fire.current(name),
    onComplete: () => {
      paused.push(true);
    },
  });
  const binding = await bindRiveTriggers({
    source: data.source,
    canDispatch: () => true,
    signal: controller.signal,
    onTrigger: (name) => player.trigger(name),
  });
  fire.current = binding.fire;
  data.callbacks.get("hapticEntry")?.();
  const ready = [...timers.entries()][0];
  if (!ready) throw new Error("Entry did not arm the actual ready trigger");
  timers.delete(ready[0]);
  now = 2500;
  ready[1].callback();
  expect(data.triggered).toEqual(["isLoaded"]);
  expect(timers.size).toBe(0);
  expect(paused).toEqual([]);
  data.callbacks.get("isLoaded")?.();
  expect(timers.size).toBe(1);
  const timer = [...timers.values()][0];
  if (!timer) throw new Error("Ready did not arm scene completion");
  now += timer.delayMs;
  timer.callback();
  expect(paused).toEqual([true]);
  expect(player.completed()).toBe(true);
  player.pause();
  player.resume();
  data.callbacks.get("hapticEntry")?.();
  expect(player.completed()).toBe(true);
  expect(paused).toEqual([true]);
  controller.abort();
  player.stop();
});

test("hidden and background scenes cannot rearm completion through queued VM callbacks", async () => {
  const data = scene();
  const controller = new AbortController();
  let focused = true;
  let foreground = true;
  let pending = 0;
  const player = createRiveHaptics({
    play: () => {},
    canPlay: () => true,
    schedule: () => ++pending,
    cancel: () => pending--,
    completion: {
      startTrigger: "hapticEntry",
      readyTrigger: "isLoaded",
      entryMs: 2200,
      loopPeriodMs: 1600,
      exitMs: 560,
      marginMs: 80,
      readyAfterMs: 2500,
    },
    fireTrigger: () => {},
  });
  const binding = await bindRiveTriggers({
    source: data.source,
    canDispatch: () => focused && foreground,
    signal: controller.signal,
    onTrigger: (name) => player.trigger(name),
  });
  const queued = data.callbacks.get("hapticEntry");
  queued?.();
  expect(pending).toBe(1);
  player.stop();
  focused = false;
  queued?.();
  binding.fire("isLoaded");
  expect(pending).toBe(0);
  expect(data.triggered).toEqual([]);
  focused = true;
  foreground = false;
  queued?.();
  binding.fire("isLoaded");
  expect(pending).toBe(0);
  expect(data.triggered).toEqual([]);
  foreground = true;
  queued?.();
  expect(pending).toBe(1);
  controller.abort();
  player.stop();
  expect(pending).toBe(0);
});
