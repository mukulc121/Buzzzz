import { emptyPattern } from "@buzzzz/core";
import { expect, test } from "bun:test";
import { metricById } from "../src/features/audio/metrics";
import { metricPoints, scaleCaption } from "../src/features/audio/metrics/display";
import { deriveAudioReplacement, isEdited } from "../src/features/audio/selection";

const series = { stepMs: 10, values: Float32Array.from([0, 0.5, 2]) };

test("fit to clip normalizes to the peak; true value uses the metric's full scale", () => {
  const sharpness = metricById("sharpness")!;
  expect(metricPoints(series, sharpness.scale, "clip", false).map((point) => point.value)).toEqual([
    0, 0.25, 1,
  ]);
  expect(metricPoints(series, sharpness.scale, "full", false).map((point) => point.value)).toEqual([
    0, 0.125, 0.5,
  ]);
  expect(metricPoints(series, sharpness.scale, "full", false)[2]).toEqual({
    time: 20,
    value: 0.5,
    rawValue: 2,
  });
  const band = metricById("band")!;
  expect(metricPoints(series, band.scale, "full", false).at(-1)?.value).toBe(1);
});

test("the dB curve maps only level metrics over 60 dB", () => {
  const envelope = metricById("envelope")!;
  const values = metricPoints(series, envelope.scale, "clip", true).map((point) => point.value);
  expect(values[0]).toBe(0);
  expect(values[1]).toBeCloseTo(1 + (20 * Math.log10(0.25)) / 60);
  expect(values[2]).toBe(1);
  const tonality = metricById("tonality")!;
  expect(metricPoints(series, tonality.scale, "clip", true)[1].value).toBe(0.25);
});

test("scale captions follow Pulsar's wording", () => {
  expect(scaleCaption(metricById("roughness")!)).toBe("full scale 8 asper");
  expect(scaleCaption(metricById("band")!)).toBe("no absolute reference: stays fit to this clip");
  expect(scaleCaption(metricById("tonality")!)).toBeNull();
});

test("an applied approach counts as edited only once the pattern changes", () => {
  const applied = {
    ...emptyPattern(),
    discretePattern: [{ time: 0, amplitude: 0.5, frequency: 0.5 }],
  };
  expect(isEdited(applied, null)).toBe(false);
  expect(isEdited(applied, applied)).toBe(false);
  expect(
    isEdited(
      { ...applied, discretePattern: [{ time: 5, amplitude: 0.5, frequency: 0.5 }] },
      applied,
    ),
  ).toBe(true);
});

test("animation replacement protects edits while allowing candidate cycling", () => {
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
});
