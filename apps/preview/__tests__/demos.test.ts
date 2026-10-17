import { expect, test } from "bun:test";
import { isPattern } from "@buzzzz/core";
import { BUTTON_PATTERNS } from "../src/features/demos/controls/buttonPatterns";
import { tickKind } from "../src/features/demos/timers/countdown";

test("button and countdown patterns are valid and ordered", () => {
  for (const entry of BUTTON_PATTERNS) expect(isPattern(entry.pattern)).toBe(true);
  expect([5, 4, 3, 2, 1, 0].map(tickKind)).toEqual([
    "soft",
    "soft",
    "soft",
    "strong",
    "strong",
    "done",
  ]);
});
