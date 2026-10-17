import { expect, test } from "bun:test";
import { createRiveHaptics, DEX_RIVE_CONFIG } from "../src/index.ts";

function blockedClock(options: { readyAfterMs?: number; ignoreCancellation?: boolean } = {}) {
  let now = 0;
  let nextId = 0;
  const timers = new Map<number, { at: number; callback: () => void }>();
  const cues: { at: number; name: string }[] = [];
  const impacts: number[] = [];
  const completions: number[] = [];
  const stops: number[] = [];
  const script = createRiveHaptics({
    completion: {
      ...DEX_RIVE_CONFIG.completion,
      readyAfterMs: options.readyAfterMs ?? DEX_RIVE_CONFIG.completion.readyAfterMs,
    },
    haptics: DEX_RIVE_CONFIG.haptics,
    now: () => now,
    play: () => impacts.push(now),
    playPulsar: (cue) => cues.push({ at: now, name: cue.pulsar }),
    stopPulsar: () => stops.push(now),
    canPlay: () => true,
    onComplete: () => completions.push(now),
    schedule: (callback, delayMs) => {
      const id = ++nextId;
      timers.set(id, { at: now + delayMs, callback });
      return id;
    },
    cancel: (id) => {
      if (!options.ignoreCancellation) timers.delete(id);
    },
  });
  const advanceTo = (end: number) => {
    while (true) {
      const next = [...timers.entries()]
        .filter(([, timer]) => timer.at <= end)
        .sort(([aId, a], [bId, b]) => a.at - b.at || aId - bId)[0];
      if (!next) break;
      const [id, timer] = next;
      timers.delete(id);
      now = Math.max(now, timer.at);
      timer.callback();
    }
    now = end;
  };
  return {
    ...script,
    cues,
    impacts,
    completions,
    stops,
    advanceTo,
    blockTo: (end: number) => {
      now = end;
    },
    flush: () => advanceTo(now),
    pending: () => timers.size,
  };
}

test("a late exit delivers its overdue Lock while the scene is still current", () => {
  const player = blockedClock();
  player.mount();
  player.bind();
  player.advanceTo(3702);
  player.blockTo(4200);
  player.flush();
  expect(player.cues).toEqual([
    { at: 400, name: "EngineRev" },
    { at: 2200, name: "Drone" },
    { at: 4200, name: "Lock" },
  ]);
  player.advanceTo(4440);
  expect(player.completions).toEqual([4440]);
  expect(player.pending()).toBe(0);
});

test("an exit dispatched beyond scene completion never replays a stale Lock", () => {
  const player = blockedClock();
  player.mount();
  player.bind();
  player.advanceTo(3702);
  player.blockTo(4552);
  player.flush();
  player.advanceTo(10000);
  expect(player.cues.map((cue) => cue.name)).toEqual(["EngineRev", "Drone"]);
  expect(player.completions).toEqual([4552]);
  expect(player.stops).toEqual([4552]);
  expect(player.pending()).toBe(0);
});

test("a delayed entry callback keeps its cue anchored to the play epoch", () => {
  const player = blockedClock();
  player.mount();
  player.bind();
  player.blockTo(1000);
  player.flush();
  expect(player.cues).toEqual([{ at: 1000, name: "EngineRev" }]);
  player.advanceTo(2200);
  expect(player.cues.at(-1)).toEqual({ at: 2200, name: "Drone" });
});

test("an expired entry is skipped and the loop retains its original cycle deadlines", () => {
  const player = blockedClock({ readyAfterMs: 10000 });
  player.mount();
  player.bind();
  player.blockTo(2412);
  player.flush();
  expect(player.cues).toEqual([{ at: 2412, name: "Drone" }]);
  player.advanceTo(3800);
  expect(player.cues).toEqual([
    { at: 2412, name: "Drone" },
    { at: 3800, name: "Drone" },
  ]);
});

test("a blocked repeating phase skips old cycles instead of drifting or bursting", () => {
  const player = blockedClock({ readyAfterMs: 15000 });
  player.mount();
  player.bind();
  player.advanceTo(2300);
  player.blockTo(10000);
  player.flush();
  player.advanceTo(10200);
  expect(player.cues).toEqual([
    { at: 400, name: "EngineRev" },
    { at: 2200, name: "Drone" },
    { at: 10000, name: "Drone" },
    { at: 10200, name: "Drone" },
  ]);
});

test("pause excludes suspended time from overdue phase and completion checks", () => {
  const player = blockedClock();
  player.mount();
  player.bind();
  player.advanceTo(3702);
  player.pause();
  player.blockTo(8702);
  player.resume();
  player.blockTo(9200);
  player.flush();
  expect(player.cues.at(-1)).toEqual({ at: 9200, name: "Lock" });
  expect(player.completions).toEqual([]);
  player.advanceTo(9440);
  expect(player.completions).toEqual([9440]);
});

test("reset invalidates overdue callbacks even when the platform cannot cancel them", () => {
  const player = blockedClock({ ignoreCancellation: true });
  player.mount();
  player.bind();
  player.advanceTo(3702);
  player.blockTo(4200);
  player.stop();
  player.flush();
  player.advanceTo(10000);
  expect(player.cues.map((cue) => cue.name)).toEqual(["EngineRev", "Drone"]);
  expect(player.completions).toEqual([]);
});

test("a queued trigger cannot play after the logical completion deadline", () => {
  const player = blockedClock();
  player.mount();
  player.bind();
  player.advanceTo(3702);
  player.blockTo(4552);
  player.trigger("custom", { kind: "sequence", immediate: "impactSoft", cues: [] });
  player.flush();
  expect(player.cues.map((cue) => cue.name)).toEqual(["EngineRev", "Drone"]);
  expect(player.completions).toEqual([4552]);
  expect(player.impacts).toEqual([]);
});
