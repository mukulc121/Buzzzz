import { expect, test } from "bun:test";
import { emptyPattern } from "@buzzzz/core";
import { analyzeAudio } from "../src/features/audio/analysis";
import { audioMetricPoints } from "../src/features/audio/display";
import { deriveAudioReplacement } from "../src/features/audio/selection";

test("Fit, True and dB change plotted values without modifying measurements", () => {
  const analysis = analyzeAudio(
    {
      sampleRate: 24000,
      channels: [
        Float32Array.from({ length: 720 }, (_, index) =>
          index < 240 ? 0 : index < 480 ? 0.25 : 0.5,
        ),
      ],
    },
    { frameMs: 10 },
  );
  const actual = audioMetricPoints(analysis, "rms", "true", false);
  const fit = audioMetricPoints(analysis, "rms", "fit", false);
  const db = audioMetricPoints(analysis, "rms", "true", true);
  expect(actual.map((point) => point.value)).toEqual([0, 0.25, 0.5]);
  expect(fit.map((point) => point.value)).toEqual([0, 0.5, 1]);
  expect(db[0].rawValue).toBe(-60);
  expect(db[2].rawValue).toBeCloseTo(-6.0206, 3);
  expect(db[2].value).toBeCloseTo((60 - 6.0206) / 60, 4);
  expect(analysis.frames.map((frame) => frame.rms)).toEqual([0, 0.25, 0.5]);
});

test("replacement protects edits while allowing candidate cycling and unchanged selections", () => {
  const empty = emptyPattern();
  const first = {
    ...emptyPattern(),
    discretePattern: [{ time: 0, amplitude: 0.5, frequency: 0.5 }],
  };
  const second = {
    ...emptyPattern(),
    discretePattern: [{ time: 0, amplitude: 0.8, frequency: 0.5 }],
  };
  const edited = {
    ...emptyPattern(),
    discretePattern: [{ time: 100, amplitude: 0.5, frequency: 0.5 }],
  };
  expect(deriveAudioReplacement(empty, first, null)).toBe("replace");
  expect(deriveAudioReplacement(first, first, null)).toBe("unchanged");
  expect(deriveAudioReplacement(first, second, first)).toBe("replace");
  expect(deriveAudioReplacement(edited, second, first)).toBe("confirm");
  expect(deriveAudioReplacement(first, second, null)).toBe("confirm");
});
