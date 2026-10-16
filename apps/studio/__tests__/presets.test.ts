import { expect, test } from "bun:test";
import { isPattern } from "@buzzzz/core";
import presets from "../src/features/presets/data/pulsar-presets.json";
test("accepts every bundled Pulsar preset", () => {
  expect(presets.length).toBeGreaterThan(200);
  expect(
    presets.filter((preset) => !isPattern(preset.pattern)).map((preset) => preset.name),
  ).toEqual([]);
});
