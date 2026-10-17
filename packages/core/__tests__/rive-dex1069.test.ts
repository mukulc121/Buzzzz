import { expect, test } from "bun:test";
import { isPattern, isRiveConfig } from "../src/index.ts";
import { riveCuePattern, riveProfileOccurrences } from "../src/presets/library.ts";
import { DEX_RIVE_CONFIG } from "../../../apps/studio/src/features/project/starter/rive/dex-rive-config.ts";
import { DEX_RIVE_CONFIG_1063 } from "../../../apps/studio/src/features/project/starter/rive/dex-rive-config-1063.ts";
import { normalizeDexConfig } from "../../../apps/studio/src/features/project/starter/rive/normalizeDexConfig.ts";
import { riveClock } from "./fixtures/rive-clock.ts";

const dex = () =>
  riveClock({ completion: DEX_RIVE_CONFIG.completion, haptics: DEX_RIVE_CONFIG.haptics });

test("the play clock runs Dex 1069: EngineRev 400, Drone 2200, cut 3740, Lock 3940, done 4440", () => {
  const player = dex();
  player.mount();
  player.bind();
  player.advance(10_000);
  expect(player.pulsar).toEqual([
    { at: 400, name: "EngineRev", tuned: false },
    { at: 2200, name: "Drone", tuned: true },
    { at: 3940, name: "Lock", tuned: false },
  ]);
  expect(player.patternStops).toEqual([3740]);
  expect(player.fired).toEqual([{ at: 2500, name: "isLoaded" }]);
  expect(player.completions).toEqual([4440]);
  expect(player.impacts).toEqual([]);
  expect(player.pending()).toBe(0);
});

test("the play clock starts at bind; readiness still counts from mount", () => {
  const player = dex();
  player.mount();
  player.advance(100);
  player.bind();
  player.advance(10_000);
  expect(player.pulsar.map(({ at }) => at)).toEqual([500, 2300, 4040]);
  expect(player.fired).toEqual([{ at: 2500, name: "isLoaded" }]);
  expect(player.completions).toEqual([4540]);
});

test("VM phase triggers and a late isLoaded echo are breadcrumbs", () => {
  const player = dex();
  player.mount();
  player.bind();
  player.advance(100);
  player.trigger("hapticExit", DEX_RIVE_CONFIG.haptics.hapticExit);
  player.trigger("hapticLoop", DEX_RIVE_CONFIG.haptics.hapticLoop);
  player.advance(2500);
  player.trigger("isLoaded");
  player.advance(10_000);
  expect(player.pulsar.map(({ at, name }) => [at, name])).toEqual([
    [400, "EngineRev"],
    [2200, "Drone"],
    [3940, "Lock"],
  ]);
  expect(player.completions).toEqual([4440]);
});

test("a later loop cycle replays the drone until the exit cuts it", () => {
  const player = riveClock({
    completion: { ...DEX_RIVE_CONFIG.completion, readyAfterMs: 4000 },
    haptics: DEX_RIVE_CONFIG.haptics,
  });
  player.mount();
  player.bind();
  player.advance(10_000);
  expect(player.pulsar.map(({ at, name }) => [at, name])).toEqual([
    [400, "EngineRev"],
    [2200, "Drone"],
    [3800, "Drone"],
    [5540, "Lock"],
  ]);
  expect(player.patternStops).toEqual([5340]);
  expect(player.completions).toEqual([6040]);
});

test("pause holds every phase on the logical clock", () => {
  const player = dex();
  player.mount();
  player.bind();
  player.advance(2300);
  player.pause();
  player.advance(5000);
  expect(player.pulsar.map(({ at }) => at)).toEqual([400, 2200]);
  player.resume();
  player.advance(10_000);
  expect(player.pulsar.map(({ at }) => at)).toEqual([400, 2200, 8940]);
  expect(player.completions).toEqual([9440]);
});

test("a scene bound while paused gets its entry on resume", () => {
  const player = dex();
  player.mount();
  player.pause();
  player.bind();
  player.advance(1000);
  expect(player.pulsar).toEqual([]);
  player.resume();
  player.advance(500);
  expect(player.pulsar).toEqual([{ at: 1400, name: "EngineRev", tuned: false }]);
});

test("the tuned drone matches Dex scalePattern on the stock Drone", () => {
  const drone = riveCuePattern(DEX_RIVE_CONFIG.haptics.hapticLoop.cues[0]);
  expect(drone?.discretePattern).toEqual(
    [0, 445, 890, 1335].map((time) => ({ time, amplitude: 0.75, frequency: 0.6 })),
  );
  expect(drone?.continuousPattern.amplitude.at(-1)).toEqual({ time: 1584, value: 0 });
  expect(drone?.continuousPattern.amplitude[1]).toEqual({ time: 18, value: 0.7000000000000001 });
  expect(drone?.continuousPattern.frequency).toEqual([
    { time: 0, value: 0.6 },
    { time: 1584, value: 0.6 },
  ]);
});

test("profile occurrences are the real patterns on the play clock", () => {
  const profile = riveProfileOccurrences(DEX_RIVE_CONFIG);
  expect(profile && { ...profile, occurrences: undefined }).toEqual({
    durationMs: 4440,
    readyAtMs: 2500,
    exitAtMs: 3800,
    occurrences: undefined,
  });
  expect(
    profile?.occurrences.map(({ phase, timeMs, durationMs, cue }) => [
      phase,
      timeMs,
      durationMs,
      "pulsar" in cue && cue.pulsar,
    ]),
  ).toEqual([
    ["entry", 400, 1800, "EngineRev"],
    ["loop", 2200, 1540, "Drone"],
    ["exit", 3940, 220, "Lock"],
  ]);
  const late = riveProfileOccurrences(DEX_RIVE_CONFIG, { readyAtMs: 3790 });
  expect(late?.occurrences.map(({ timeMs, durationMs }) => [timeMs, durationMs])).toEqual([
    [400, 1800],
    [2200, 1584],
    [3990, 220],
  ]);
});

test("the profile validates and only an unedited 1063 starter is upgraded", () => {
  expect(isRiveConfig(DEX_RIVE_CONFIG)).toBe(true);
  expect(isRiveConfig(DEX_RIVE_CONFIG_1063)).toBe(true);
  const { hapticExit: _, ...missing } = DEX_RIVE_CONFIG.haptics;
  expect(isRiveConfig({ ...DEX_RIVE_CONFIG, haptics: missing })).toBe(false);
  expect(
    isRiveConfig({
      ...DEX_RIVE_CONFIG,
      haptics: {
        ...DEX_RIVE_CONFIG.haptics,
        hapticExit: {
          kind: "sequence",
          cues: [{ delayMs: 0, pulsar: "Lock", tuning: { gain: 1 } }],
        },
      },
    }),
  ).toBe(false);
  expect(normalizeDexConfig(structuredClone(DEX_RIVE_CONFIG_1063), "dex-tour-loader")).toEqual(
    DEX_RIVE_CONFIG,
  );
  const { clock: __, ...beforeMountFix } = DEX_RIVE_CONFIG_1063.completion;
  expect(
    normalizeDexConfig(
      { ...DEX_RIVE_CONFIG_1063, nativeSound: undefined, completion: beforeMountFix },
      "dex-tour-loader",
    ),
  ).toEqual(DEX_RIVE_CONFIG);
  const edited = structuredClone(DEX_RIVE_CONFIG_1063);
  edited.haptics.hapticEntry.cues[0].delayMs = 650;
  expect(normalizeDexConfig(edited, "dex-tour-loader")).toBe(edited);
});

test("the source hapticLoopStop marker leaves the clock and the drone alone", () => {
  const player = dex();
  player.mount();
  player.bind();
  player.advance(2300);
  expect(player.ownsPhase("hapticLoopStop")).toBe(true);
  expect(player.ownsPhase("customTrigger")).toBe(false);
  player.trigger("hapticLoopStop", { kind: "stop", trigger: "hapticLoop" });
  player.advance(10_000);
  expect(player.pulsar.map(({ at, name }) => [at, name])).toEqual([
    [400, "EngineRev"],
    [2200, "Drone"],
    [3940, "Lock"],
  ]);
  expect(player.patternStops).toEqual([3740]);
  expect(player.completions).toEqual([4440]);
});

test("negative sharpness stays a valid pattern and tiny repeats are rejected", () => {
  const dull = riveCuePattern({
    delayMs: 0,
    pulsar: "Drone",
    tuning: { timeScale: 1, gain: 1, sharpnessBoost: -1 },
  });
  expect(dull && isPattern(dull)).toBe(true);
  expect(dull?.continuousPattern.frequency.every(({ value }) => value === 0)).toBe(true);
  const tiny = {
    ...DEX_RIVE_CONFIG,
    haptics: {
      ...DEX_RIVE_CONFIG.haptics,
      hapticLoop: { kind: "sequence", immediate: "impactSoft", cues: [], repeatMs: 5e-324 },
    },
  };
  expect(isRiveConfig(tiny)).toBe(false);
  const occurrences = riveProfileOccurrences(tiny as typeof DEX_RIVE_CONFIG)?.occurrences;
  expect(occurrences?.filter(({ phase }) => phase === "loop").map(({ timeMs }) => timeMs)).toEqual([
    2200,
  ]);
});

test("dense custom loops render fully or not at all", () => {
  const dense = {
    ...DEX_RIVE_CONFIG,
    haptics: {
      ...DEX_RIVE_CONFIG.haptics,
      hapticLoop: {
        kind: "sequence" as const,
        cues: [{ delayMs: 0, preset: "impactSoft" as const }],
        repeatMs: 1,
      },
    },
  };
  expect(isRiveConfig(dense)).toBe(true);
  const loop = riveProfileOccurrences(dense)?.occurrences.filter(({ phase }) => phase === "loop");
  expect(loop?.length).toBe(1540);
  expect(loop?.at(-1)?.timeMs).toBe(3739);
  expect(riveProfileOccurrences(dense, { readyAtMs: 60_000 })).toBeUndefined();
});
