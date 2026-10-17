import { expect, test } from "bun:test";
import { rangePattern, isRiveAssetUrl, pairingLink } from "../src/index";

test("range playback interpolates boundaries and rebases each layer", () => {
  const result = rangePattern(
    {
      discretePattern: [{ time: 300, amplitude: 1, frequency: 0.5 }],
      continuousPattern: {
        amplitude: [
          { time: 0, value: 0 },
          { time: 1000, value: 1 },
        ],
        frequency: [],
      },
    },
    250,
    750,
  );
  expect(result.continuousPattern.amplitude).toEqual([
    { time: 0, value: 0.25 },
    { time: 500, value: 0.75 },
  ]);
  expect(result.discretePattern[0].time).toBe(50);
});

test("hosted file and pairing links require bounded capabilities and safe origins", () => {
  const path = `/v1/rooms/${"a".repeat(32)}/assets/${"b".repeat(32)}.riv?token=${"c".repeat(43)}`;
  expect(isRiveAssetUrl(`https://relay.example${path}`)).toBe(true);
  expect(isRiveAssetUrl(`http://relay.example${path}`)).toBe(false);
  expect(isRiveAssetUrl(`https://relay.example${path}&admin=1`)).toBe(false);
  expect(
    pairingLink(
      `rivehaptics://pair?server=https%3A%2F%2Frelay.example&room=${"a".repeat(32)}&code=123456`,
    )?.code,
  ).toBe("123456");
  expect(
    pairingLink(`rivehaptics://pair?server=javascript:alert(1)&room=${"a".repeat(32)}&code=123456`),
  ).toBeNull();
});
