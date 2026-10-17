import { expect, test } from "bun:test";
import { createRiveHaptics, patternEnd, type Pattern } from "../src/index.ts";
import { riveCuePattern, riveProfileOccurrences } from "../src/presets/rive.ts";
import { DEX_RIVE_CONFIG } from "../../../apps/studio/src/features/project/starter/rive/dex-rive-config.ts";

type TReferenceEvent = { at: number } & (
  | { kind: "play"; preset: string }
  | { kind: "stop" | "ready" | "complete" }
);

// Executed from Dex PR 1069 ed09e5dc's hook and timing module; VM breadcrumbs were not echoed.
const REFERENCE = {
  head: "ed09e5dcd2a24b56f8df48877707dd24fb719e31",
  loopPattern: {
    discretePattern: [
      {
        time: 0,
        amplitude: 0.75,
        frequency: 0.6,
      },
      {
        time: 445,
        amplitude: 0.75,
        frequency: 0.6,
      },
      {
        time: 890,
        amplitude: 0.75,
        frequency: 0.6,
      },
      {
        time: 1335,
        amplitude: 0.75,
        frequency: 0.6,
      },
    ],
    continuousPattern: {
      amplitude: [
        {
          time: 0,
          value: 0,
        },
        {
          time: 18,
          value: 0.7000000000000001,
        },
        {
          time: 160,
          value: 0.7000000000000001,
        },
        {
          time: 249,
          value: 0,
        },
        {
          time: 445,
          value: 0,
        },
        {
          time: 463,
          value: 0.7000000000000001,
        },
        {
          time: 605,
          value: 0.7000000000000001,
        },
        {
          time: 694,
          value: 0,
        },
        {
          time: 890,
          value: 0,
        },
        {
          time: 908,
          value: 0.7000000000000001,
        },
        {
          time: 1050,
          value: 0.7000000000000001,
        },
        {
          time: 1139,
          value: 0,
        },
        {
          time: 1335,
          value: 0,
        },
        {
          time: 1353,
          value: 0.7000000000000001,
        },
        {
          time: 1495,
          value: 0.7000000000000001,
        },
        {
          time: 1584,
          value: 0,
        },
      ],
      frequency: [
        {
          time: 0,
          value: 0.6,
        },
        {
          time: 1584,
          value: 0.6,
        },
      ],
    },
  },
  runs: [
    {
      bindAt: 0,
      requestedReadyAt: 2500,
      events: [
        {
          at: 400,
          kind: "play",
          preset: "EngineRev",
        },
        {
          at: 2200,
          kind: "play",
          preset: "Drone",
        },
        {
          at: 2500,
          kind: "ready",
        },
        {
          at: 3740,
          kind: "stop",
        },
        {
          at: 3940,
          kind: "play",
          preset: "Lock",
        },
        {
          at: 4440,
          kind: "complete",
        },
      ],
    },
    {
      bindAt: 500,
      requestedReadyAt: 2500,
      events: [
        {
          at: 900,
          kind: "play",
          preset: "EngineRev",
        },
        {
          at: 2500,
          kind: "ready",
        },
        {
          at: 2700,
          kind: "play",
          preset: "Drone",
        },
        {
          at: 4240,
          kind: "stop",
        },
        {
          at: 4440,
          kind: "play",
          preset: "Lock",
        },
        {
          at: 4940,
          kind: "complete",
        },
      ],
    },
    {
      bindAt: 3000,
      requestedReadyAt: 2500,
      events: [
        {
          at: 3000,
          kind: "ready",
        },
        {
          at: 3400,
          kind: "play",
          preset: "EngineRev",
        },
        {
          at: 5200,
          kind: "play",
          preset: "Drone",
        },
        {
          at: 6740,
          kind: "stop",
        },
        {
          at: 6940,
          kind: "play",
          preset: "Lock",
        },
        {
          at: 7440,
          kind: "complete",
        },
      ],
    },
    {
      bindAt: 0,
      requestedReadyAt: 3790,
      events: [
        {
          at: 400,
          kind: "play",
          preset: "EngineRev",
        },
        {
          at: 2200,
          kind: "play",
          preset: "Drone",
        },
        {
          at: 3790,
          kind: "ready",
        },
        {
          at: 3790,
          kind: "stop",
        },
        {
          at: 3990,
          kind: "play",
          preset: "Lock",
        },
        {
          at: 4440,
          kind: "complete",
        },
      ],
    },
    {
      bindAt: 0,
      requestedReadyAt: 3800,
      events: [
        {
          at: 400,
          kind: "play",
          preset: "EngineRev",
        },
        {
          at: 2200,
          kind: "play",
          preset: "Drone",
        },
        {
          at: 3800,
          kind: "ready",
        },
        {
          at: 3800,
          kind: "play",
          preset: "Drone",
        },
        {
          at: 3800,
          kind: "stop",
        },
        {
          at: 4000,
          kind: "play",
          preset: "Lock",
        },
        {
          at: 4440,
          kind: "complete",
        },
      ],
    },
    {
      bindAt: 0,
      requestedReadyAt: 3801,
      events: [
        {
          at: 400,
          kind: "play",
          preset: "EngineRev",
        },
        {
          at: 2200,
          kind: "play",
          preset: "Drone",
        },
        {
          at: 3800,
          kind: "play",
          preset: "Drone",
        },
        {
          at: 3801,
          kind: "ready",
        },
        {
          at: 5340,
          kind: "stop",
        },
        {
          at: 5540,
          kind: "play",
          preset: "Lock",
        },
        {
          at: 6040,
          kind: "complete",
        },
      ],
    },
    {
      bindAt: 0,
      requestedReadyAt: 6000,
      events: [
        {
          at: 400,
          kind: "play",
          preset: "EngineRev",
        },
        {
          at: 2200,
          kind: "play",
          preset: "Drone",
        },
        {
          at: 3800,
          kind: "play",
          preset: "Drone",
        },
        {
          at: 5400,
          kind: "play",
          preset: "Drone",
        },
        {
          at: 6000,
          kind: "ready",
        },
        {
          at: 6940,
          kind: "stop",
        },
        {
          at: 7140,
          kind: "play",
          preset: "Lock",
        },
        {
          at: 7640,
          kind: "complete",
        },
      ],
    },
  ],
} satisfies {
  head: string;
  loopPattern: Pattern;
  runs: { bindAt: number; requestedReadyAt: number; events: TReferenceEvent[] }[];
};

function clock(readyAfterMs: number, echoReady = false) {
  let now = 0;
  let sequence = 0;
  const timers = new Map<number, { at: number; callback: () => void }>();
  const events: TReferenceEvent[] = [];
  let ready = (_name: string) => {};
  const player = createRiveHaptics({
    completion: { ...DEX_RIVE_CONFIG.completion, readyAfterMs },
    haptics: DEX_RIVE_CONFIG.haptics,
    now: () => now,
    canPlay: () => true,
    play: () => {
      throw new Error("The source profile never plays UIKit impact cues");
    },
    playPulsar: (cue) => events.push({ at: now, kind: "play", preset: cue.pulsar }),
    stopPulsar: () => events.push({ at: now, kind: "stop" }),
    fireTrigger: (name) => {
      expect(name).toBe("isLoaded");
      events.push({ at: now, kind: "ready" });
      if (echoReady) ready(name);
    },
    onComplete: () => events.push({ at: now, kind: "complete" }),
    schedule: (callback, delayMs) => {
      const id = ++sequence;
      timers.set(id, { at: now + delayMs, callback });
      return id;
    },
    cancel: (id) => {
      timers.delete(id);
    },
  });
  ready = (name) => player.trigger(name);
  const advanceTo = (end: number) => {
    while (true) {
      const next = [...timers.entries()]
        .filter(([, timer]) => timer.at <= end)
        .sort(([aId, a], [bId, b]) => a.at - b.at || aId - bId)[0];
      if (!next) break;
      timers.delete(next[0]);
      now = next[1].at;
      next[1].callback();
    }
    now = end;
  };
  return { player, events, advanceTo };
}

test("the loop equals the actual source scalePattern output, including every rounded point", () => {
  const pattern = riveCuePattern({
    delayMs: 0,
    pulsar: "Drone",
    tuning: { timeScale: 0.89, gain: 2.5, sharpnessBoost: 0.15 },
  });
  expect(pattern).toEqual(REFERENCE.loopPattern);
  expect(patternEnd(REFERENCE.loopPattern)).toBe(1584);
});

test.each(REFERENCE.runs)(
  "source scheduling survives absent VM callbacks: bound $bindAt, ready requested $requestedReadyAt",
  (reference) => {
    const runtime = clock(reference.requestedReadyAt);
    runtime.player.mount();
    runtime.advanceTo(reference.bindAt);
    expect(runtime.events).toEqual([]);
    runtime.player.bind();
    runtime.advanceTo(20_000);
    expect(runtime.events).toEqual(reference.events);
    expect(runtime.player.completed()).toBe(true);
  },
);

test.each(REFERENCE.runs)(
  "timeline occurrences agree with actual source plays: bound $bindAt, ready requested $requestedReadyAt",
  (reference) => {
    const result = riveProfileOccurrences(DEX_RIVE_CONFIG, {
      readyAtMs: Math.max(0, reference.requestedReadyAt - reference.bindAt),
    });
    if (!result) throw new Error("Missing source profile occurrences");
    const complete = reference.events.find((event) => event.kind === "complete");
    if (!complete) throw new Error("Missing source completion");
    expect(result.durationMs).toBe(complete.at - reference.bindAt);
    const expected = reference.events.flatMap((event) => {
      if (event.kind !== "play") return [];
      const stop = reference.events.find((item) => item.kind === "stop" && item.at >= event.at);
      if (event.preset === "Drone" && stop?.at === event.at) return [];
      return [{ timeMs: event.at - reference.bindAt, preset: event.preset }];
    });
    expect(
      result.occurrences.map((item) => ({
        timeMs: item.timeMs,
        preset: "pulsar" in item.cue ? item.cue.pulsar : item.cue.preset,
      })),
    ).toEqual(expected);
  },
);

test("source entry and exit presets land their main impulses at the intended visual offsets", () => {
  const rev = riveCuePattern(DEX_RIVE_CONFIG.haptics.hapticEntry.cues[0]);
  const lock = riveCuePattern(DEX_RIVE_CONFIG.haptics.hapticExit.cues[0]);
  if (!rev || !lock) throw new Error("Missing source Pulsar presets");
  expect(rev.discretePattern).toEqual([
    { time: 700, amplitude: 0.8, frequency: 0.4 },
    { time: 1400, amplitude: 1, frequency: 0.5 },
  ]);
  expect(lock.discretePattern).toEqual([
    { time: 0, amplitude: 0.3, frequency: 0.5 },
    { time: 150, amplitude: 0.9, frequency: 0.7 },
  ]);
  expect(DEX_RIVE_CONFIG.haptics.hapticEntry.cues[0].delayMs + patternEnd(rev)).toBe(2200);
  const profile = riveProfileOccurrences(DEX_RIVE_CONFIG);
  const occurrence = profile?.occurrences.find(
    (item) => "pulsar" in item.cue && item.cue.pulsar === "Lock",
  );
  const main = lock.discretePattern.find((tap) => tap.amplitude === 0.9);
  if (!profile || !occurrence || !main) throw new Error("Missing main exit impulse");
  expect(occurrence.timeMs + main.time - profile.exitAtMs).toBe(290);
});
