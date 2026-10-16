import { expect, test } from "bun:test";
import { isPattern } from "@buzzzz/core";
import { analyzeAudio } from "../src/features/audio/analysis";
import { AUDIO_APPROACHES, generateAudioCandidates } from "../src/features/audio/generation";

function musicalSignal(seconds = 4, sampleRate = 24000) {
  return {
    sampleRate,
    channels: [
      Float32Array.from({ length: seconds * sampleRate }, (_, index) => {
        const time = index / sampleRate;
        const note = time < seconds / 2 ? 110 : 330;
        const local = index % (sampleRate / 2);
        const click = local < 200 ? 0.45 * Math.exp(-local / 30) * Math.sin(local * 1.27) : 0;
        return (time < seconds / 2 ? 0.15 : 0.45) * Math.sin(2 * Math.PI * note * time) + click;
      }),
    ],
  };
}

function valueAt(points: { time: number; value: number }[], time: number) {
  const right = points.findIndex((point) => point.time >= time);
  if (right < 0) return points.at(-1)?.value ?? 0;
  if (!right) return points[0].value;
  const before = points[right - 1];
  const after = points[right];
  return (
    before.value +
    ((after.value - before.value) * (time - before.time)) / (after.time - before.time)
  );
}

test("all nine approaches produce distinct valid, sorted, trim-relative patterns", () => {
  const analysis = analyzeAudio(musicalSignal(), { offsetMs: 500, durationMs: 3000 });
  const candidates = generateAudioCandidates(analysis);
  expect(candidates.map((candidate) => candidate.id)).toEqual(
    AUDIO_APPROACHES.map((approach) => approach.id),
  );
  expect(candidates).toHaveLength(9);
  for (const candidate of candidates) {
    expect(isPattern(candidate.pattern)).toBe(true);
    expect(candidate.eventCount).toBe(candidate.pattern.discretePattern.length);
    expect(candidate.pointCount).toBe(
      candidate.pattern.continuousPattern.amplitude.length +
        candidate.pattern.continuousPattern.frequency.length,
    );
    for (const points of [
      candidate.pattern.discretePattern,
      candidate.pattern.continuousPattern.amplitude,
      candidate.pattern.continuousPattern.frequency,
    ]) {
      expect(
        points.every(
          (point, index) =>
            point.time >= 0 &&
            point.time <= analysis.durationMs &&
            (!index || point.time >= points[index - 1].time),
        ),
      ).toBe(true);
    }
  }
  expect(new Set(candidates.map((candidate) => JSON.stringify(candidate.pattern))).size).toBe(9);
  expect(candidates.find((candidate) => candidate.id === "transients")?.eventCount).toBeGreaterThan(
    2,
  );
  expect(candidates.find((candidate) => candidate.id === "beats")?.eventCount).toBeGreaterThan(2);
  expect(candidates.find((candidate) => candidate.id === "rms")?.pointCount).toBeLessThan(
    analysis.frames.length,
  );
});

test("envelope strength and melodic contour follow a louder, higher second note", () => {
  const analysis = analyzeAudio(musicalSignal());
  const candidates = generateAudioCandidates(analysis);
  const rms = candidates.find((candidate) => candidate.id === "rms");
  const melodic = candidates.find((candidate) => candidate.id === "melodic");
  const amplitude = rms?.pattern.continuousPattern.amplitude ?? [];
  expect(valueAt(amplitude, 3000)).toBeGreaterThan(valueAt(amplitude, 1000) + 0.2);
  const frequency = melodic?.pattern.continuousPattern.frequency ?? [];
  expect(valueAt(frequency, 3000)).toBeGreaterThan(valueAt(frequency, 1000) + 0.2);
});

test("silence generates no haptics, and estimates disclose their limits", () => {
  const analysis = analyzeAudio({ sampleRate: 24000, channels: [new Float32Array(24000)] });
  for (const candidate of generateAudioCandidates(analysis)) {
    expect(candidate.pointCount).toBe(0);
    expect(candidate.eventCount).toBe(0);
    expect(isPattern(candidate.pattern)).toBe(true);
  }
  expect(
    AUDIO_APPROACHES.find((approach) => approach.id === "filter-chain")?.description,
  ).toContain("Android native chain");
  expect(AUDIO_APPROACHES.find((approach) => approach.id === "transients")?.approximate).toBe(true);
});

test("generation settings alter output and all settings reject nonfinite values", () => {
  const analysis = analyzeAudio(musicalSignal());
  const normal = generateAudioCandidates(analysis);
  const softer = generateAudioCandidates(analysis, {
    intensity: 0.25,
    frequencyShift: 0.2,
    smoothingMs: 50,
  });
  const a = normal.find((candidate) => candidate.id === "rms")?.pattern.continuousPattern;
  const b = softer.find((candidate) => candidate.id === "rms")?.pattern.continuousPattern;
  expect(Math.max(...(b?.amplitude.map((point) => point.value) ?? []))).toBeLessThanOrEqual(0.25);
  expect(b?.frequency[0].value).toBeCloseTo((a?.frequency[0].value ?? 0) + 0.2, 3);
  const noTaps = generateAudioCandidates(analysis, { minimumTapStrength: 2 }).find(
    (candidate) => candidate.id === "transients",
  );
  expect(noTaps?.eventCount).toBe(0);
  expect(() => generateAudioCandidates(analysis, { intensity: Number.NaN })).toThrow("finite");
});

test("60-second, 2 ms analyses remain within core point and duration limits", () => {
  const sampleRate = 1000;
  const source = {
    sampleRate,
    channels: [
      Float32Array.from(
        { length: 61000 },
        (_, index) => (Math.sin(index * 0.8) * (index % 7)) / 10,
      ),
    ],
  };
  const analysis = analyzeAudio(source, { frameMs: 2 });
  expect(analysis.frames).toHaveLength(30000);
  expect(analysis.durationMs).toBe(60000);
  for (const candidate of generateAudioCandidates(analysis, { reductionTolerance: 0.001 })) {
    expect(isPattern(candidate.pattern)).toBe(true);
    expect(candidate.pattern.continuousPattern.amplitude.length).toBeLessThanOrEqual(10000);
    expect(candidate.pattern.continuousPattern.frequency.length).toBeLessThanOrEqual(10000);
  }
});
