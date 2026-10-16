import { expect, test } from "bun:test";
import { soundDuration } from "../src/features/composer/soundGraph";

const empty = { amplitude: [], frequency: [] };

test("sound lasts until the final tap's voices finish ringing", () => {
  const afterglow = [0, 75, 150].map((time) => ({ time, amplitude: 1, frequency: 0.5 }));
  expect(soundDuration({ discretePattern: afterglow, continuousPattern: empty })).toBeCloseTo(
    0.173,
  );
});

test("continuous sound ends 10ms after its last amplitude point", () => {
  const curve = [
    { time: 0, value: 1 },
    { time: 400, value: 0 },
  ];
  const pattern = { discretePattern: [{ time: 100, amplitude: 1, frequency: 1 }] };
  expect(
    soundDuration({ ...pattern, continuousPattern: { amplitude: curve, frequency: curve } }),
  ).toBeCloseTo(0.41);
  expect(
    soundDuration({ ...pattern, continuousPattern: { amplitude: curve, frequency: [] } }),
  ).toBeCloseTo(0.123);
});
