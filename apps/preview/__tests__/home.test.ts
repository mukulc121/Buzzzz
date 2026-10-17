import { describe, expect, test } from "bun:test";
import {
  deriveConnectionInput,
  deriveConnectionRow,
  deriveHapticsSupport,
} from "../src/features/home/model";

describe("published Home connection presentation", () => {
  test("keeps cached haptics reachable while offline and distinguishes connection failures", () => {
    expect(deriveConnectionRow("connected")).toEqual({
      color: "rgba(87, 180, 149, 1)",
      label: "Tap to view haptics",
    });
    expect(deriveConnectionRow("idle")).toEqual({
      color: "rgba(255, 98, 89, 1)",
      label: "Tap to view haptics",
    });
    expect(deriveConnectionRow("connecting")).toEqual({
      color: "rgba(56, 172, 221, 1)",
      label: "Connecting…",
    });
    expect(deriveConnectionRow("error")).toEqual({
      color: "rgba(255, 98, 89, 1)",
      label: "Couldn’t connect",
    });
  });

  test("uses the published input sizes and hides its placeholder while focused", () => {
    expect(deriveConnectionInput("", false)).toEqual({
      fontSize: 16,
      paddingVertical: 18,
      placeholder: "Connecting code",
    });
    expect(deriveConnectionInput("", true)).toEqual({
      fontSize: 25,
      paddingVertical: 12.5,
      placeholder: "",
    });
    expect(deriveConnectionInput("wss://example.com", false)).toEqual({
      fontSize: 25,
      paddingVertical: 12.5,
      placeholder: "Connecting code",
    });
  });

  test("maps all four Android haptic support levels to published copy", () => {
    expect([0, 1, 2, 3, -1].map(deriveHapticsSupport)).toEqual([
      { name: "None", description: "Your device does not support haptics." },
      { name: "Limited", description: "Some presets may not work as expected on your device." },
      { name: "Standard", description: "Most presets are fully supported on your device." },
      { name: "Advanced", description: "All presets are fully supported on your device." },
      { name: "None", description: "Your device does not support haptics." },
    ]);
  });
});
