import { expect, test } from "bun:test";
import { emptyPattern, isPattern } from "@buzzzz/core";
import { DEFAULT_GENERATION_OPTIONS, tuneGeneratedPattern } from "../src/features/audio/tuning";

const neutral = {
  contrast: 0,
  gamma: 1,
  silenceFloor: 0,
  transientDuck: 0,
  intensity: 1,
  envelopeHz: 100,
  maxPoints: 10000,
  maxEvents: 10000,
  reductionTolerance: 0.001,
};

test("observed global defaults are explicit and numeric settings must be finite", () => {
  expect(DEFAULT_GENERATION_OPTIONS).toMatchObject({
    contrast: 0.3,
    gamma: 0.5,
    silenceFloor: 0.05,
    transientDuck: 0.2,
    envelopeHz: 100,
    maxPoints: 240,
    maxEvents: 120,
  });
  expect(() => tuneGeneratedPattern(emptyPattern(), { gamma: Number.NaN })).toThrow("finite");
  expect(isPattern(tuneGeneratedPattern(emptyPattern(), { gamma: undefined }))).toBe(true);
});

test("contrast, gamma and silence floor change actual envelope strength", () => {
  const pattern = {
    ...emptyPattern(),
    continuousPattern: {
      amplitude: [
        { time: 0, value: 0.1 },
        { time: 100, value: 0.1 },
      ],
      frequency: [{ time: 0, value: 0.5 }],
    },
  };
  const base = tuneGeneratedPattern(pattern, neutral).continuousPattern.amplitude[0].value;
  const contrast = tuneGeneratedPattern(pattern, { ...neutral, contrast: 1 }).continuousPattern
    .amplitude[0].value;
  const gamma = tuneGeneratedPattern(pattern, { ...neutral, gamma: 0.5 }).continuousPattern
    .amplitude[0].value;
  const floor = tuneGeneratedPattern(pattern, { ...neutral, silenceFloor: 0.15 }).continuousPattern
    .amplitude[0].value;
  expect(contrast).toBeLessThan(base);
  expect(gamma).toBeGreaterThan(base);
  expect(floor).toBe(0);
});

test("transient ducking attenuates nearby continuous haptics and preserves taps", () => {
  const pattern = {
    discretePattern: [{ time: 50, amplitude: 1, frequency: 0.5 }],
    continuousPattern: {
      amplitude: [
        { time: 0, value: 1 },
        { time: 100, value: 1 },
      ],
      frequency: [],
    },
  };
  const ducked = tuneGeneratedPattern(pattern, { ...neutral, transientDuck: 0.6 }, [50]);
  expect(ducked.continuousPattern.amplitude.find((point) => point.time === 50)?.value).toBe(0.4);
  expect(ducked.continuousPattern.amplitude[0].value).toBeGreaterThan(0.9);
  expect(ducked.discretePattern[0].amplitude).toBe(1);
});

test("resolution and budgets constrain actual curves and retain the strongest events", () => {
  const pattern = {
    discretePattern: [
      { time: 10, amplitude: 0.2, frequency: 0.5 },
      { time: 20, amplitude: 0.9, frequency: 0.5 },
      { time: 30, amplitude: 0.7, frequency: 0.5 },
    ],
    continuousPattern: {
      amplitude: Array.from({ length: 7 }, (_, index) => ({ time: index * 10, value: index % 2 })),
      frequency: [],
    },
  };
  const coarse = tuneGeneratedPattern(pattern, { ...neutral, envelopeHz: 20 });
  const fine = tuneGeneratedPattern(pattern, { ...neutral, envelopeHz: 200 });
  expect(fine.continuousPattern.amplitude.length).toBeGreaterThan(
    coarse.continuousPattern.amplitude.length,
  );
  const capped = tuneGeneratedPattern(pattern, { ...neutral, maxPoints: 2, maxEvents: 2 });
  expect(capped.continuousPattern.amplitude).toHaveLength(2);
  expect(capped.discretePattern.map((tap) => tap.time)).toEqual([20, 30]);
  expect(isPattern(capped)).toBe(true);
});
