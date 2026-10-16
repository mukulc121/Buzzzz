import { expect, test } from "bun:test";
import { isPattern } from "@buzzzz/core";
import { pulsarPresets as presets } from "../src/presets/library";
test("accepts every bundled Pulsar preset", () => {
  expect(presets.length).toBeGreaterThan(200);
  expect(presets.every((preset) => new Set(preset.tags).size === preset.tags.length)).toBe(true);
  expect(
    presets.filter((preset) => !isPattern(preset.pattern)).map((preset) => preset.name),
  ).toEqual([]);
});
