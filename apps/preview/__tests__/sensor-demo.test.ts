import { expect, test } from "bun:test";
import reference from "./fixtures/sensor-reference.json";
import { advanceSensor, sensorTypeForPlatform } from "../src/features/demos/sensors/sensorPhysics";

type SensorCall =
  | { kind: "stop" }
  | { kind: "set" | "discrete"; amplitude: number; frequency: number };

test("sensor selection matches each published platform module", () => {
  expect(reference.provenance.sensorTypes.ios).toBe(sensorTypeForPlatform(false));
  expect(reference.provenance.sensorTypes.android).toBe(sensorTypeForPlatform(true));
});

for (const fixture of reference.cases) {
  test(`published sensor worklet: ${fixture.name}`, () => {
    let state = fixture.initial;
    for (const step of fixture.steps) {
      const result = advanceSensor({
        state,
        sensorX: step.reading.x,
        sensorY: step.reading.y,
        isAndroid: fixture.isAndroid,
        now: step.reading.now,
      });
      expect(result.state).toEqual({
        dotX: expect.closeTo(step.state.dotX, 12),
        dotY: expect.closeTo(step.state.dotY, 12),
        velocityX: expect.closeTo(step.state.velocityX, 12),
        velocityY: expect.closeTo(step.state.velocityY, 12),
        isColliding: step.state.isColliding,
        lastCollisionTime: step.state.lastCollisionTime,
        lastScratchTime: step.state.lastScratchTime,
      });
      const calls: SensorCall[] = [];
      if (result.discrete) calls.push({ kind: "discrete", ...result.discrete });
      calls.push(result.continuous);
      expect(calls).toHaveLength(step.calls.length);
      for (const [index, call] of calls.entries()) {
        const expected = step.calls[index];
        expect(expected.kind).toBe(call.kind);
        if (call.kind !== "stop") {
          if (typeof expected.amplitude !== "number" || typeof expected.frequency !== "number") {
            throw new Error("Published feedback fixture has no amplitude or frequency");
          }
          expect(call.amplitude).toBeCloseTo(expected.amplitude, 12);
          expect(call.frequency).toBeCloseTo(expected.frequency, 12);
        }
      }
      state = result.state;
    }
  });
}
