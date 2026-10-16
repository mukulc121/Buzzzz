import { expect, test } from "bun:test";
import { AUDIO_ANALYSES, analyzeAudio, analyzeAudioAsync } from "../src/features/audio/analysis";
import type { IAudioSignal } from "../src/features/audio/model";

const sampleRate = 24000;
function signal(seconds: number, sample: (time: number, index: number) => number): IAudioSignal {
  return {
    sampleRate,
    channels: [
      Float32Array.from({ length: Math.round(seconds * sampleRate) }, (_, index) =>
        sample(index / sampleRate, index),
      ),
    ],
  };
}
const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;

test("silence has zero energy, no detected attacks, pitch or beats", () => {
  const analysis = analyzeAudio(signal(1, () => 0));
  expect(analysis.frames).toHaveLength(50);
  expect(analysis.frameMs).toBe(20);
  expect(analysis.onsets).toEqual([]);
  expect(analysis.tempoBpm).toBeNull();
  expect(analysis.beatTimesMs).toEqual([]);
  for (const frame of analysis.frames) {
    for (const metric of AUDIO_ANALYSES) expect(frame[metric.id]).toBe(0);
    expect(frame.pitchHz).toBe(0);
  }
});

test("FFT measures known frequencies, band energy, pitch and RMS", () => {
  const low = analyzeAudio(signal(1, (time) => 0.5 * Math.sin(2 * Math.PI * 100 * time)));
  const high = analyzeAudio(signal(1, (time) => 0.5 * Math.sin(2 * Math.PI * 4000 * time)));
  const note = analyzeAudio(signal(1, (time) => 0.5 * Math.sin(2 * Math.PI * 440 * time)));
  expect(low.frames[25].rms).toBeCloseTo(0.5 / Math.sqrt(2), 2);
  expect(low.frames[25].spectralCentroidHz).toBeCloseTo(100, 0);
  expect(high.frames[25].spectralCentroidHz).toBeCloseTo(4000, 0);
  expect(low.frames[25].bandEnergy).toBeGreaterThan(0.99);
  expect(high.frames[25].bandEnergy).toBeLessThan(0.01);
  expect(high.frames[25].sharpness).toBeGreaterThan(low.frames[25].sharpness);
  expect(note.frames[25].pitchHz).toBeGreaterThan(435);
  expect(note.frames[25].pitchHz).toBeLessThan(445);
  expect(note.frames[25].tonality).toBeGreaterThan(0.99);
});

test("out-of-phase stereo retains energy and spectral content", () => {
  const mono = signal(0.5, (time) => 0.4 * Math.sin(2 * Math.PI * 220 * time));
  const left = mono.channels[0];
  const stereo = analyzeAudio({ sampleRate, channels: [left, left.map((value) => -value)] });
  const reference = analyzeAudio(mono);
  expect(stereo.frames[15].rms).toBeCloseTo(reference.frames[15].rms, 7);
  expect(stereo.frames[15].spectralCentroidHz).toBeCloseTo(220, 0);
});

test("spectral-flux attacks recover a 120 BPM click train and percussion", () => {
  const clicks = signal(8, (_, index) => {
    const local = index % (sampleRate / 2);
    return local < 240 ? Math.exp(-local / 35) * Math.sin(local * 1.27) : 0;
  });
  const analysis = analyzeAudio(clicks);
  expect(analysis.onsets).toHaveLength(16);
  expect(analysis.tempoBpm).toBeCloseTo(120, 0);
  expect(analysis.beatTimesMs.slice(0, 4)).toEqual([0, 500, 1000, 1500]);
  for (let index = 0; index < 16; index++)
    expect(Math.abs(analysis.onsets[index].timeMs - index * 500)).toBeLessThanOrEqual(20);
  const tone = analyzeAudio(signal(1, (time) => 0.5 * Math.sin(2 * Math.PI * 440 * time)));
  expect(analysis.frames[25].percussiveShare).toBeGreaterThan(
    tone.frames[25].percussiveShare + 0.3,
  );
});

test("modulation measures distinguish rough and slowly varying signals", () => {
  const steady = analyzeAudio(signal(2, (time) => 0.5 * Math.sin(2 * Math.PI * 1000 * time)));
  const rough = analyzeAudio(
    signal(
      2,
      (time) =>
        0.5 * (0.5 + 0.5 * Math.sin(2 * Math.PI * 70 * time)) * Math.sin(2 * Math.PI * 1000 * time),
    ),
  );
  const fluctuating = analyzeAudio(
    signal(
      2,
      (time) =>
        0.5 * (0.5 + 0.5 * Math.sin(2 * Math.PI * 4 * time)) * Math.sin(2 * Math.PI * 1000 * time),
    ),
  );
  expect(mean(rough.frames.slice(50).map((frame) => frame.roughness))).toBeGreaterThan(
    mean(steady.frames.slice(50).map((frame) => frame.roughness)) * 2,
  );
  expect(
    mean(fluctuating.frames.slice(50).map((frame) => frame.fluctuationStrength)),
  ).toBeGreaterThan(mean(steady.frames.slice(50).map((frame) => frame.fluctuationStrength)) * 2);
});

test("trim metadata is source-relative, frame times are selection-relative and length is capped", () => {
  const source = { sampleRate: 1000, channels: [new Float32Array(70000)] };
  const analysis = analyzeAudio(source, { offsetMs: 1234, durationMs: 69000, frameMs: 100 });
  expect(analysis.window).toEqual({ startMs: 1234, durationMs: 60000 });
  expect(analysis.sourceDurationMs).toBe(70000);
  expect(analysis.frames[0].timeMs).toBe(0);
  expect(analysis.frames.at(-1)?.timeMs).toBe(59900);
  expect(source.channels[0].length).toBe(70000);
  expect(analyzeAudio(source, { offsetMs: 69950, durationMs: 1000 }).durationMs).toBe(50);
  expect(analyzeAudio(source, { offsetMs: 71000 }).frames).toEqual([]);
});

test("2 ms frames are supported, bad settings reject, nonfinite samples cannot poison features", () => {
  const source = signal(0.02, () => Number.NaN);
  const result = analyzeAudio(source, { frameMs: 2, offsetMs: undefined });
  expect(result.frames).toHaveLength(10);
  expect(result.frames.every((frame) => Object.values(frame).every(Number.isFinite))).toBe(true);
  expect(() => analyzeAudio(source, { frameMs: Number.NaN })).toThrow("finite");
  expect(() => analyzeAudio({ sampleRate: 0, channels: [] })).toThrow("sample rate");
  expect(() =>
    analyzeAudio({ sampleRate, channels: [new Float32Array(1), new Float32Array(2)] }),
  ).toThrow("matching lengths");
});

test("worker analysis matches synchronous trim and preserves source buffers", async () => {
  const source = signal(1, (time) => 0.3 * Math.sin(2 * Math.PI * 200 * time));
  const options = { offsetMs: 200, durationMs: 400, frameMs: 10 };
  const expected = analyzeAudio(source, options);
  const actual = await analyzeAudioAsync(source, options);
  expect(actual).toEqual(expected);
  expect(source.channels[0].length).toBe(sampleRate);
  const controller = new AbortController();
  controller.abort();
  await expect(analyzeAudioAsync(source, {}, controller.signal)).rejects.toMatchObject({
    name: "AbortError",
  });
});

test("sample-aligned 44.1 kHz windows retain their last sample and beyond-end trims are empty", async () => {
  const source = { sampleRate: 44100, channels: [new Float32Array(1024).fill(0.5)] };
  const full = analyzeAudio(source);
  expect(full.durationMs).toBe((1024 / 44100) * 1000);
  expect(analyzeAudio(source, { offsetMs: 1000 }).frames).toHaveLength(0);
  expect(await analyzeAudioAsync(source)).toEqual(full);
});
