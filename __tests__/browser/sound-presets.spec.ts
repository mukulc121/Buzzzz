import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import ts from "typescript";
import { isPattern, patternEnd, rangePattern, toDevice, type Pattern } from "@buzzzz/core";
import { patternDigest } from "./fixtures/pulsar/digest.ts";
import { lowpassGains, roundingBudget } from "./fixtures/pulsar/roundingBudget.ts";

interface IOracle {
  commit: string;
  presets: { file: string; name: string; digest: string }[];
}
interface IFeatures {
  length: number;
  onsets: number[];
  crossings: number[];
  rms: number[];
  peak: number;
  last: number;
  tail: number[];
}
interface IRender {
  sampleRate: number;
  reference: IFeatures;
  actual: IFeatures;
  maxDiff: number;
  selfDiff: number;
  filterL1: number;
}

const fixture = (name: string) =>
  readFileSync(new URL(`./fixtures/pulsar/${name}`, import.meta.url), "utf8");
const oracle: IOracle = JSON.parse(fixture("presets.json"));
const pulsarPlayer = ts.transpileModule(fixture("audio-player.ts.txt"), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText;
// Same filter as @buzzzz/core/presets, whose JSON import Playwright's loader can't read.
const shipped = (
  JSON.parse(
    readFileSync(
      new URL("../../packages/core/src/presets/pulsar-presets.json", import.meta.url),
      "utf8",
    ),
  ) as { name: string; pattern: unknown }[]
).filter((preset): preset is { name: string; pattern: Pattern } => isPattern(preset.pattern));
const SAMPLE_RATES = [44100, 48000];
const TAP_MS = 23;
const played = (pattern: Pattern) => toDevice(rangePattern(pattern, 0, patternEnd(pattern)));

async function openOracle(page: Page) {
  await page.route("**/__sound-oracle", (route) =>
    route.fulfill({ contentType: "text/html", body: "<!doctype html><title>oracle</title>" }),
  );
  await page.goto("/__sound-oracle");
}

// Renders Pulsar's own player and Studio's graph (delayed by `offset` seconds) in the same browser.
function render(page: Page, pattern: Pattern, offset = 0, buffered = false) {
  const args = {
    pattern,
    played: played(pattern),
    pulsarPlayer,
    sampleRates: buffered ? [44100] : SAMPLE_RATES,
    offset,
    buffered,
  };
  return page.evaluate(async ({ pattern, played, pulsarPlayer, sampleRates, offset, buffered }) => {
    const soundGraph = "/src/features/composer/soundGraph.ts";
    const { schedulePatternSound } = await import(soundGraph);
    const player = URL.createObjectURL(new Blob([pulsarPlayer], { type: "text/javascript" }));
    const { AudioPatternUtility } = await import(player);
    // Pulsar's preset-audio CLI stubs the playback context the same way; only the offline render is used.
    Object.defineProperty(window, "AudioContext", {
      configurable: true,
      value: class {
        state = "running";
        async resume() {}
      },
    });
    const features = (samples: Float32Array, rate: number) => {
      const ms = rate / 1000;
      const window = Math.round(5 * ms);
      const onsets: number[] = [];
      const crossings: number[] = [];
      const rms: number[] = [];
      let quiet = Infinity;
      let peak = 0;
      let last = -1;
      for (let index = 0; index < samples.length; index++) {
        const value = Math.abs(samples[index]!);
        if (value > 1e-6) {
          if (quiet >= ms) onsets.push(index);
          quiet = 0;
          last = index;
        } else quiet++;
        peak = Math.max(peak, value);
      }
      for (let start = 0; start < samples.length; start += window) {
        const end = Math.min(samples.length, start + window);
        let energy = 0;
        let signs = 0;
        for (let index = start; index < end; index++) {
          energy += samples[index]! ** 2;
          if (index > start && samples[index]! * samples[index - 1]! < 0) signs++;
        }
        rms.push(Math.sqrt(energy / (end - start)));
        crossings.push(signs);
      }
      const tail = Array.from(samples.subarray(Math.max(0, last - Math.round(10 * ms)), last + 1));
      return { length: samples.length, onsets, crossings, rms, peak, last, tail };
    };
    const pulsarRender = async (sampleRate: number): Promise<Float32Array> => {
      const pulsar = new AudioPatternUtility();
      pulsar.sampleRate = sampleRate;
      await pulsar.parsePattern(pattern);
      return pulsar.renderedBuffer.getChannelData(0);
    };
    // L1 gain of Pulsar's lowpass (700 Hz, Q 5) as this browser implements it.
    const filterL1 = async (sampleRate: number) => {
      const context = new OfflineAudioContext(1, sampleRate * 2, sampleRate);
      const impulse = context.createBuffer(1, 1, sampleRate);
      impulse.getChannelData(0)[0] = 1;
      const source = context.createBufferSource();
      const filter = context.createBiquadFilter();
      source.buffer = impulse;
      filter.type = "lowpass";
      filter.frequency.value = 700;
      filter.Q.value = 5;
      source.connect(filter).connect(context.destination);
      source.start(0);
      return (await context.startRendering())
        .getChannelData(0)
        .reduce((sum, v) => sum + Math.abs(v), 0);
    };
    const results = [];
    for (const sampleRate of sampleRates) {
      const reference = await pulsarRender(sampleRate);
      const rerun = await pulsarRender(sampleRate);
      let selfDiff = rerun.length === reference.length ? 0 : Infinity;
      for (let index = 0; index < reference.length; index++)
        selfDiff = Math.max(selfDiff, Math.abs(rerun[index]! - reference[index]!));
      const delay = Math.round(offset * sampleRate);
      const context = new OfflineAudioContext(1, reference.length + delay, sampleRate);
      if (buffered) {
        const modulePath = "/src/features/composer/audio.ts";
        const { prepareSound } = await import(modulePath);
        const source = context.createBufferSource();
        source.buffer = await prepareSound(played);
        source.connect(context.destination);
        source.start(offset);
      } else schedulePatternSound(context, played, offset);
      const actual = (await context.startRendering()).getChannelData(0).subarray(delay);
      let maxDiff = 0;
      for (let index = 0; index < reference.length; index++)
        maxDiff = Math.max(maxDiff, Math.abs(actual[index]! - reference[index]!));
      results.push({
        sampleRate,
        reference: features(reference, sampleRate),
        actual: features(actual, sampleRate),
        maxDiff,
        selfDiff,
        filterL1: await filterL1(sampleRate),
      });
    }
    return results;
  }, args) as Promise<IRender[]>;
}

const maxGap = (actual: number[], expected: number[]) =>
  Math.max(0, ...expected.map((value, index) => Math.abs(value - (actual[index] ?? Infinity))));

test("shipped preset catalog is Pulsar's, preset for preset", () => {
  expect(shipped.map((preset) => [preset.name, patternDigest(preset.pattern)])).toEqual(
    oracle.presets.map((preset) => [preset.name, preset.digest]),
  );
});

test("Studio's 151-preset catalog is Pulsar studio's, preset for preset", () => {
  const studio = JSON.parse(
    readFileSync(
      new URL(
        "../../apps/studio/src/features/presets/data/pulsar-studio-presets.json",
        import.meta.url,
      ),
      "utf8",
    ),
  ) as { name: string; pattern: Pattern }[];
  expect(studio.map((preset) => [preset.name, patternDigest(preset.pattern)])).toEqual(
    oracle.presets
      .filter(({ file }) => file.startsWith("presets/"))
      .map((preset) => [preset.name, preset.digest]),
  );
});

for (const [index, entry] of oracle.presets.entries()) {
  test(`${entry.file} sounds like Pulsar at 44.1k and 48k`, async ({ page }) => {
    const pattern = shipped[index]!.pattern;
    await openOracle(page);
    for (const result of await render(page, pattern)) {
      const { sampleRate, reference, actual, maxDiff, selfDiff } = result;
      const budget = roundingBudget(pattern, sampleRate, reference.peak);
      const at = `${entry.name} @ ${sampleRate}`;
      expect(result.filterL1, `${at}: browser lowpass is the spec filter`).toBeCloseTo(
        lowpassGains(sampleRate).response,
        4,
      );
      expect(reference.peak, `${at}: Pulsar renders sound`).toBeGreaterThan(0.01);
      expect(actual.length, `${at}: length`).toBe(reference.length);
      expect(actual.onsets, `${at}: onsets`).toEqual(reference.onsets);
      expect(actual.crossings, `${at}: zero crossings per 5ms`).toEqual(reference.crossings);
      expect(maxGap(actual.rms, reference.rms), `${at}: envelope`).toBeLessThanOrEqual(budget);
      expect(actual.last, `${at}: last audible sample`).toBe(reference.last);
      expect(maxGap(actual.tail, reference.tail), `${at}: tail samples`).toBeLessThanOrEqual(
        budget,
      );
      expect(selfDiff, `${at}: Pulsar rerun within rounding budget`).toBeLessThanOrEqual(budget);
      expect(maxDiff, `${at}: every sample within rounding budget`).toBeLessThanOrEqual(budget);
      if (pattern.continuousPattern.amplitude.length) continue;
      const taps = pattern.discretePattern.filter(
        (tap, tapIndex, all) => !tapIndex || tap.time - all[tapIndex - 1]!.time > TAP_MS + 1,
      );
      expect(actual.onsets.length, `${at}: discrete events`).toBe(taps.length);
      for (const [tapIndex, tap] of taps.entries())
        expect(
          Math.abs(actual.onsets[tapIndex]! - (tap.time / 1000) * sampleRate),
          `${at}: tap ${tap.time}ms onset`,
        ).toBeLessThanOrEqual(2);
    }
  });
}

test("Studio buffer playback preserves every preset through its scheduling lead", async ({
  page,
}) => {
  test.setTimeout(240_000);
  await openOracle(page);
  for (const [index, entry] of oracle.presets.entries())
    for (const result of await render(page, shipped[index]!.pattern, 0.03, true))
      expect(result.maxDiff, `${entry.name} @ ${result.sampleRate}`).toBeLessThanOrEqual(
        roundingBudget(shipped[index]!.pattern, result.sampleRate, result.reference.peak),
      );
});

const studioBundle = process.env.PULSAR_STUDIO_BUNDLE;
test("deployed Pulsar studio presets and synth match the docs oracle", async ({ page }) => {
  test.skip(!studioBundle, "Set PULSAR_STUDIO_BUNDLE to a saved pulsar.swmansion.com bundle.");
  const bundle = readFileSync(studioBundle!, "utf8");
  const slice = (from: string, to: string) => {
    const start = bundle.indexOf(from);
    const end = bundle.indexOf(to, start);
    if (start < 0 || end < 0) throw new Error(`Bundle anchor missing: ${from}`);
    return bundle.slice(start, end);
  };
  const synth = `const ${slice("Lde=44100,", ";function FT(")};${slice("function FT(", "class Ude{")}${slice("function Fde(", "const hb=new Ude")}export { Vde as render };`;
  const deployed = (
    JSON.parse(slice('[{"id":"afterglow"', "]`)") + "]") as {
      name: string;
      pattern: {
        intensity: Pattern["continuousPattern"]["amplitude"];
        frequency: Pattern["continuousPattern"]["frequency"];
        discrete: { time: number; intensity: number; frequency: number }[];
      };
    }[]
  ).map(({ name, pattern }) => ({
    name,
    pattern: {
      discretePattern: pattern.discrete.map(({ time, intensity, frequency }) => ({
        time,
        amplitude: intensity,
        frequency,
      })),
      continuousPattern: { amplitude: pattern.intensity, frequency: pattern.frequency },
    },
  }));
  const docs = oracle.presets.filter(({ file }) => file.startsWith("presets/"));
  expect(deployed.map(({ name, pattern }) => [name, patternDigest(pattern)])).toEqual(
    docs.map(({ name, digest }) => [name, digest]),
  );
  await openOracle(page);
  const gaps = await page.evaluate(
    async ({ synth, pulsarPlayer, presets, sampleRates }) => {
      const url = (code: string) =>
        URL.createObjectURL(new Blob([code], { type: "text/javascript" }));
      const { render } = await import(url(synth));
      const { AudioPatternUtility } = await import(url(pulsarPlayer));
      Object.defineProperty(window, "AudioContext", {
        configurable: true,
        value: class {
          state = "running";
          async resume() {}
        },
      });
      const gaps: { name: string; sampleRate: number; gap: number; peak: number }[] = [];
      for (const { name, pattern } of presets)
        for (const sampleRate of sampleRates) {
          const docs = new AudioPatternUtility();
          docs.sampleRate = sampleRate;
          await docs.parsePattern(pattern);
          const expected: Float32Array = docs.renderedBuffer.getChannelData(0);
          const actual: Float32Array = (await render(pattern, sampleRate)).getChannelData(0);
          let gap = actual.length === expected.length ? 0 : Infinity;
          let peak = 0;
          for (let index = 0; index < expected.length; index++) {
            gap = Math.max(gap, Math.abs(actual[index]! - expected[index]!));
            peak = Math.max(peak, Math.abs(expected[index]!));
          }
          gaps.push({ name, sampleRate, gap, peak });
        }
      return gaps;
    },
    { synth, pulsarPlayer, presets: deployed, sampleRates: SAMPLE_RATES },
  );
  const over = gaps.filter(({ name, sampleRate, gap, peak }) => {
    const pattern = deployed.find((preset) => preset.name === name)!.pattern;
    return gap > roundingBudget(pattern, sampleRate, peak);
  });
  expect(over).toEqual([]);
  expect(gaps).toHaveLength(deployed.length * SAMPLE_RATES.length);
});
