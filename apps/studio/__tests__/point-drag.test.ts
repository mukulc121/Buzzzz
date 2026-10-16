import { expect, test } from "bun:test";
import type { Pattern } from "@buzzzz/core";
import { dragPoint } from "../src/features/composer/pointDrag";

test("discrete drag modes preserve the fields and neighboring selection they do not edit", () => {
  const pattern: Pattern = {
    discretePattern: [{ time: 100, amplitude: 0.4, frequency: 0.7 }],
    continuousPattern: { amplitude: [{ time: 50, value: 0.2 }], frequency: [] },
  };
  const point = { layer: "discrete", index: 0 } as const;
  const props = {
    pattern,
    point,
    selection: [point, { layer: "amplitude", index: 0 } as const],
    timeMs: 20,
    value: 0.2,
    valueDecimals: 1,
  };
  expect(dragPoint({ ...props, mode: "time" }).discretePattern[0]).toEqual({
    time: 120,
    amplitude: 0.4,
    frequency: 0.7,
  });
  const amplitude = dragPoint({ ...props, mode: "amplitude" });
  expect(amplitude.discretePattern[0]).toEqual({ time: 100, amplitude: 0.6, frequency: 0.7 });
  expect(amplitude.continuousPattern).toEqual(pattern.continuousPattern);
  expect(dragPoint({ ...props, mode: "frequency" }).discretePattern[0]).toEqual({
    time: 100,
    amplitude: 0.4,
    frequency: 0.9,
  });
  expect(pattern.discretePattern[0]).toEqual({ time: 100, amplitude: 0.4, frequency: 0.7 });
});
