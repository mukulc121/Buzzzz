import { expect, test } from "bun:test";
import { patternEnd } from "@buzzzz/core";
import { riveCuePattern } from "@buzzzz/core/presets";
import { deriveRiveCueTimeline } from "../src/features/rive/riveCueTimeline";
import { DEX_RIVE_CONFIG } from "../src/features/project/starter/rive/dex-rive-config";

function sourceTimeline(readyAtMs?: number) {
  const timeline = deriveRiveCueTimeline(DEX_RIVE_CONFIG, readyAtMs);
  if (!timeline) throw new Error("Canonical Dex timeline missing");
  return timeline;
}

test("the source profile renders real EngineRev, tuned Drone and Lock at canonical boundaries", () => {
  const timeline = sourceTimeline();
  expect(timeline).toMatchObject({ durationMs: 4440, readyAtMs: 2500, exitAtMs: 3800 });
  expect(
    timeline.segments.map((segment) => [
      segment.continuousPattern.amplitude[0].time,
      patternEnd(segment),
    ]),
  ).toEqual([
    [400, 2200],
    [2200, 3740],
    [3940, 4160],
  ]);
  expect(timeline.pattern.discretePattern.map((tap) => tap.time)).toEqual([
    1100, 1800, 2200, 2645, 3090, 3535, 3940, 4090,
  ]);
});

test("clipping interpolates the source Drone endpoint before its immediate stop", () => {
  const timeline = sourceTimeline();
  const drone = timeline.segments[1];
  const cue = DEX_RIVE_CONFIG.haptics.hapticLoop.cues[0];
  const source = riveCuePattern(cue);
  if (!source) throw new Error("Source Drone missing");
  const before = source.continuousPattern.amplitude.find((point) => point.time === 1495);
  const after = source.continuousPattern.amplitude.find((point) => point.time === 1584);
  if (!before || !after) throw new Error("Source clip neighbors missing");
  const expected =
    before.value +
    ((1540 - before.time) / (after.time - before.time)) * (after.value - before.value);
  expect(drone.continuousPattern.amplitude.slice(-2)).toEqual([
    { time: 3740, value: expected },
    { time: 3740, value: 0 },
  ]);
  expect(drone.continuousPattern.frequency).toEqual([
    { time: 2200, value: 0.6 },
    { time: 3740, value: 0.6 },
  ]);
  expect(drone.discretePattern.every((tap) => tap.time < 3740)).toBe(true);
  expect(
    timeline.pattern.continuousPattern.amplitude.filter(
      (point) => point.time > 3740 && point.time < 3940,
    ),
  ).toEqual([]);
  expect(timeline.segments[2].continuousPattern.frequency[0]).toEqual({ time: 3940, value: 0.4 });
});

test("source presets are unchanged and silence boundaries do not invent ramps between segments", () => {
  const entry = riveCuePattern(DEX_RIVE_CONFIG.haptics.hapticEntry.cues[0]);
  if (!entry) throw new Error("EngineRev missing");
  const snapshot = structuredClone(entry);
  const timeline = sourceTimeline();
  expect(timeline.segments[0].continuousPattern.amplitude.slice(1)).toEqual(
    entry.continuousPattern.amplitude.map((point) => ({ ...point, time: point.time + 400 })),
  );
  expect(timeline.segments[0].continuousPattern.frequency).toEqual(
    entry.continuousPattern.frequency.map((point) => ({ ...point, time: point.time + 400 })),
  );
  expect(entry).toEqual(snapshot);
  expect(
    timeline.segments.map((segment) => segment.continuousPattern.amplitude.at(-1)?.value),
  ).toEqual([0, 0, 0]);
});

test("manual readiness comes from canonical occurrences rather than a second phase calculation", () => {
  const early = sourceTimeline(0);
  expect(early.durationMs).toBe(4440);
  const late = sourceTimeline(9000);
  expect(late.durationMs).toBe(10840);
  expect(late.segments).toHaveLength(7);
  const boundary = sourceTimeline(3790);
  expect(patternEnd(boundary.segments[1])).toBe(3784);
  expect(boundary.segments[2].continuousPattern.amplitude[0].time).toBe(3990);
});

test("a loop impulse exactly at the phase stop is excluded while natural ending impulses remain", () => {
  const timeline = deriveRiveCueTimeline({
    ...DEX_RIVE_CONFIG,
    completion: {
      ...DEX_RIVE_CONFIG.completion,
      phases: { ...DEX_RIVE_CONFIG.completion.phases, exitLeadMs: 265 },
    },
  });
  if (!timeline) throw new Error("Clipped source timeline missing");
  expect(patternEnd(timeline.segments[1])).toBe(3535);
  expect(timeline.segments[1].discretePattern.map((tap) => tap.time)).toEqual([2200, 2645, 3090]);
  expect(timeline.segments[2].discretePattern.map((tap) => tap.time)).toEqual([3735, 3885]);
});

test("unresolvable profiles and invalid ready times have no invented waveform", () => {
  for (const ready of [-1, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_VALUE])
    expect(deriveRiveCueTimeline(DEX_RIVE_CONFIG, ready)).toBeNull();
  expect(deriveRiveCueTimeline(undefined)).toBeNull();
  expect(
    deriveRiveCueTimeline({
      ...DEX_RIVE_CONFIG,
      completion: { ...DEX_RIVE_CONFIG.completion, phases: undefined },
    }),
  ).toBeNull();
  expect(deriveRiveCueTimeline({ ...DEX_RIVE_CONFIG, haptics: {} })).toBeNull();
});
