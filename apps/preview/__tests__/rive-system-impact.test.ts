import { expect, test } from "bun:test";
import { playSystemImpact } from "../src/features/playback/systemImpact";

test("configured impacts call the matching native System preset without synthesizing a pattern", () => {
  const calls: string[] = [];
  const system = {
    impactSoft: () => {
      calls.push("SystemImpactSoft");
    },
    impactLight: () => {
      calls.push("SystemImpactLight");
    },
    impactMedium: () => {
      calls.push("SystemImpactMedium");
    },
  };
  playSystemImpact("impactSoft", system);
  playSystemImpact("impactLight", system);
  playSystemImpact("impactMedium", system);
  expect(calls).toEqual(["SystemImpactSoft", "SystemImpactLight", "SystemImpactMedium"]);
});
