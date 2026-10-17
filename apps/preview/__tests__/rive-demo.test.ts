import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { DEX_RIVE_CONFIG } from "@buzzzz/core";
import { DEMOS } from "../src/features/demos/catalog";
import { isRivePreviewPath, RIVE_DEMO_PATH } from "../src/features/preview/routes";

test("the bundled Rive demo is reachable and uses the unchanged Studio asset", () => {
  const demo = DEMOS.find((entry) => entry.id === "rive");
  expect(`/demos/${demo?.slug}`).toBe(RIVE_DEMO_PATH);
  const native = readFileSync(
    new URL("../src/features/demos/rive/assets/dexHeadoutIntegration.riv", import.meta.url),
  );
  const studio = readFileSync(
    new URL(
      "../../studio/src/features/project/starter/rive/dexHeadoutIntegration.riv",
      import.meta.url,
    ),
  );
  expect(native.equals(studio)).toBe(true);
  expect(createHash("sha256").update(native).digest("hex")).toBe(
    "a1e7943e8b53816bdeff29cdf91441da5dd2c7fa5fe5f5c150100c12204a0da6",
  );
  expect(DEX_RIVE_CONFIG.haptics.hapticEntry.cues[0].pulsar).toBe("EngineRev");
  expect(DEX_RIVE_CONFIG.haptics.hapticLoop.cues[0].pulsar).toBe("Drone");
  expect(DEX_RIVE_CONFIG.haptics.hapticExit.cues[0].pulsar).toBe("Lock");
});

test("fullscreen and sound policy recognize only the two Rive scenes", () => {
  expect(
    ["/preview", "/demos/rive-demo", "/demos", "/demos/lottie-demo", "/presets"].map(
      isRivePreviewPath,
    ),
  ).toEqual([true, true, false, false, false]);
});
