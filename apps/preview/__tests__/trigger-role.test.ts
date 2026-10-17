import { expect, test } from "bun:test";
import type { IRiveConfig } from "@buzzzz/core";
import { deriveTriggerRole } from "../src/features/preview/triggerRole";

const config: IRiveConfig = {
  haptics: { hapticEntry: { kind: "sequence", cues: [] } },
  completion: {
    startTrigger: "hapticEntry",
    readyTrigger: "isLoaded",
    entryMs: 1,
    loopPeriodMs: 1,
    exitMs: 1,
    marginMs: 0,
  },
};

test("classifies haptic, ready control and unmapped triggers", () => {
  expect(deriveTriggerRole("hapticEntry", ["hapticEntry"], config)).toBe("haptic");
  expect(deriveTriggerRole("isLoaded", ["hapticEntry"], config)).toBe("control");
  expect(deriveTriggerRole("isLoaded", ["isLoaded"], config)).toBe("haptic");
  expect(deriveTriggerRole("hapticExit", ["hapticEntry"], config)).toBe("unmapped");
  expect(deriveTriggerRole("isLoaded", [], undefined)).toBe("unmapped");
});
