import { describe, expect, test } from "bun:test";
import type { Pattern } from "@buzzzz/core";
import { derivePlaybackLabel } from "../src/features/composer/playbackLabel";

const pattern: Pattern = {
  discretePattern: [{ time: 0, amplitude: 1, frequency: 0.5 }],
  continuousPattern: { amplitude: [], frequency: [] },
};
const options = {
  name: "Afterglow",
  pattern,
  playing: false,
  durationMs: 150,
  range: null,
  cursor: 0,
  phones: 0,
  onPhone: true,
  sound: true,
  audio: false,
  animation: false,
};

describe("Pulsar toolbar playback label", () => {
  test("lists actual outputs in source order and counts connected devices", () => {
    expect(derivePlaybackLabel(options)).toEqual({
      label: "Play “Afterglow” - sound · P",
      devices: 0,
    });
    expect(derivePlaybackLabel({ ...options, phones: 1 }).label).toBe(
      "Play “Afterglow” - 1 device, sound · P",
    );
    expect(derivePlaybackLabel({ ...options, phones: 2, audio: true, animation: true })).toEqual({
      label: "Play “Afterglow” - 2 devices, audio, animation · P",
      devices: 2,
    });
    expect(derivePlaybackLabel({ ...options, animation: true }).label).toBe(
      "Play “Afterglow” - animation, sound · P",
    );
  });
  test("describes phone connection and disabled outputs", () => {
    expect(derivePlaybackLabel({ ...options, sound: false }).label).toBe(
      "Connect a phone to play on device",
    );
    expect(derivePlaybackLabel({ ...options, sound: false, onPhone: false }).label).toBe(
      "Nothing to play - check the Preview switches",
    );
    expect(derivePlaybackLabel({ ...options, phones: 2, onPhone: false }).devices).toBe(0);
  });
  test("reports the active cursor and selected range", () => {
    expect(
      derivePlaybackLabel({ ...options, range: { start: 10, end: 100 }, cursor: 75 }).label,
    ).toBe("Play “Afterglow” - sound (75-100 ms) · P");
    expect(derivePlaybackLabel({ ...options, cursor: 150 }).label).toBe(
      "Play “Afterglow” - sound · P",
    );
  });
  test("warns for unmatched continuous curves but preserves taps and media", () => {
    const continuousPattern = { amplitude: [{ time: 0, value: 1 }], frequency: [] };
    const gap = "the Frequency layer is empty, so the Intensity curve can't play";
    expect(
      derivePlaybackLabel({ ...options, pattern: { ...pattern, continuousPattern } }).label,
    ).toBe(`Play “Afterglow” - sound · ${gap} · P`);
    expect(
      derivePlaybackLabel({
        ...options,
        pattern: { discretePattern: [], continuousPattern },
      }).label,
    ).toBe(`Nothing to play - ${gap} · P`);
    expect(
      derivePlaybackLabel({
        ...options,
        audio: true,
        pattern: { discretePattern: [], continuousPattern },
      }).label,
    ).toBe(`Play “Afterglow” - audio · ${gap} · P`);
    expect(
      derivePlaybackLabel({
        ...options,
        pattern: {
          discretePattern: [],
          continuousPattern: { amplitude: [], frequency: [{ time: 0, value: 0.5 }] },
        },
      }).label,
    ).toBe("Nothing to play - the Intensity layer is empty, so the Frequency curve can't play · P");
  });
  test("playing takes precedence while retaining the device indicator", () => {
    expect(derivePlaybackLabel({ ...options, playing: true, phones: 1 })).toEqual({
      label: "Stop (P)",
      devices: 1,
    });
  });
});
