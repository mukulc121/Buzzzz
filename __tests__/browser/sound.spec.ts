import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import type { Pattern } from "@buzzzz/core";

interface ISoundReference {
  windowSamples: number;
  cases: {
    name: string;
    pattern: Pattern;
    sampleRate: number;
    length: number;
    rms: number[];
    fingerprint: [number, number][];
    peak: number;
  }[];
}
const reference: ISoundReference = JSON.parse(
  readFileSync(new URL("./fixtures/pulsar-sound.json", import.meta.url), "utf8"),
);

for (const fixture of reference.cases) {
  test(`sound matches Pulsar's rendered ${fixture.name}`, async ({ page }) => {
    await page.goto("/");
    const rendered = await page.evaluate(
      async ({ fixture, windowSamples }) => {
        const modulePath = "/src/features/composer/soundGraph.ts";
        const { schedulePatternSound } = await import(modulePath);
        const context = new OfflineAudioContext(1, fixture.length, fixture.sampleRate);
        schedulePatternSound(context, fixture.pattern, 0);
        const buffer = await context.startRendering();
        const samples = buffer.getChannelData(0);
        const rms = [];
        let peak = 0;
        for (let start = 0; start < samples.length; start += windowSamples) {
          const end = Math.min(samples.length, start + windowSamples);
          let total = 0;
          for (let index = start; index < end; index++) {
            total += samples[index]! ** 2;
            peak = Math.max(peak, Math.abs(samples[index]!));
          }
          rms.push(Math.sqrt(total / (end - start)));
        }
        return {
          rms,
          peak,
          fingerprint: fixture.fingerprint.map(([index]) => samples[index]),
        };
      },
      { fixture, windowSamples: reference.windowSamples },
    );
    expect(rendered.rms).toHaveLength(fixture.rms.length);
    for (const [index, expected] of fixture.rms.entries())
      expect(rendered.rms[index]).toBeCloseTo(expected, 5);
    for (const [index, [, expected]] of fixture.fingerprint.entries())
      expect(rendered.fingerprint[index]).toBeCloseTo(expected, 5);
    expect(rendered.peak).toBeCloseTo(fixture.peak, 5);
  });
}

test("stopping scheduled sound and incomplete envelopes stay silent", async ({ page }) => {
  await page.goto("/");
  const peaks = await page.evaluate(async (pattern) => {
    const modulePath = "/src/features/composer/soundGraph.ts";
    const { schedulePatternSound } = await import(modulePath);
    const cases = [
      { pattern, stop: true },
      { pattern: { discretePattern: [], continuousPattern: { amplitude: [], frequency: [] } } },
      {
        pattern: {
          discretePattern: [],
          continuousPattern: { ...pattern.continuousPattern, frequency: [] },
        },
      },
      {
        pattern: {
          discretePattern: [],
          continuousPattern: { ...pattern.continuousPattern, amplitude: [] },
        },
      },
    ];
    const peaks = [];
    for (const item of cases) {
      const context = new OfflineAudioContext(1, 44100, 44100);
      const stop = schedulePatternSound(context, item.pattern, 0.08);
      if (item.stop) stop();
      const buffer = await context.startRendering();
      peaks.push(
        buffer.getChannelData(0).reduce((peak, value) => Math.max(peak, Math.abs(value)), 0),
      );
    }
    return peaks;
  }, reference.cases[2]!.pattern);
  expect(peaks).toEqual([0, 0, 0, 0]);
});
