import { createHash } from "node:crypto";
import type { IGenerationOptions, StrategyParams } from "../../src/features/audio/generation/model";
import { STRATEGIES } from "../../src/features/audio/generation/strategies";
import { AUDIO_METRICS, metricDefaults } from "../../src/features/audio/metrics";

function noise(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32 - 0.5;
  };
}

// Signals chosen so every strategy and metric produces a non-trivial result.
export function signals(rate: number, seconds = 0.6) {
  const length = Math.round(rate * seconds);
  const tone = new Float32Array(length);
  const drums = new Float32Array(length);
  const voice = new Float32Array(length);
  const random = noise(7);
  for (let index = 0; index < length; index += 1) {
    const t = index / rate;
    tone[index] =
      0.4 * Math.sin(2 * Math.PI * 220 * t) * (0.6 + 0.4 * Math.sin(2 * Math.PI * 4 * t));
    const beat = t % 0.25;
    drums[index] =
      Math.exp(-beat * 30) * (0.7 * Math.sin(2 * Math.PI * 60 * beat) + 0.3 * random()) +
      (Math.floor(t * 8) % 2 ? 0.05 * random() : 0);
    const pitch = 180 + 120 * Math.sin(2 * Math.PI * 2 * t);
    voice[index] = (t % 0.3 < 0.2 ? 0.3 : 0) * Math.sin(2 * Math.PI * pitch * t);
  }
  return { tone, drums, voice, silence: new Float32Array(length) };
}

const TUNED: Pick<IGenerationCase, "options" | "strategyParams"> = {
  options: {
    envelopeHz: 60,
    maxPoints: 120,
    maxEvents: 40,
    silenceFloor: 0.02,
    gamma: 0.8,
    transientDuck: 0.4,
    contrast: 0.6,
  },
  strategyParams: Object.fromEntries(
    STRATEGIES.map((strategy) => [
      strategy.id,
      Object.fromEntries(strategy.params.map((param) => [param.id, param.min + param.step * 2])),
    ]),
  ),
};

interface IGenerationCase {
  name: string;
  sampleRate: number;
  channels: Float32Array[];
  options?: IGenerationOptions;
  strategyParams?: StrategyParams;
}

export function generationCases() {
  const cases: IGenerationCase[] = [];
  for (const [name, samples] of Object.entries(signals(44100)))
    for (const [tuning, run] of Object.entries({ defaults: {}, tuned: TUNED }))
      cases.push({
        name: `${name}/44100/${tuning}`,
        sampleRate: 44100,
        channels: [samples, samples.map((value) => value * 0.5)],
        ...run,
      });
  cases.push({ name: "drums/48000/defaults", sampleRate: 48000, channels: [signals(48000).drums] });
  return cases;
}

export function metricCases() {
  const { drums, voice } = signals(44100);
  const cases = [];
  for (const metric of AUDIO_METRICS) {
    const variants = {
      defaults: metricDefaults(metric),
      edges: Object.fromEntries(
        (metric.params ?? []).map((param) => [param.id, param.max - param.step]),
      ),
    };
    for (const [signal, samples] of Object.entries({ drums, voice }))
      for (const frameMs of [2, 20, 100])
        for (const [variant, params] of Object.entries(variants))
          cases.push({
            name: `${metric.id}/${signal}/${frameMs}/${variant}`,
            metric,
            samples,
            frameMs,
            params,
          });
  }
  return cases;
}

export function voiceCases() {
  return Object.entries(signals(44100)).map(([name, samples]) => ({
    name,
    sampleRate: 44100,
    channels: [samples],
  }));
}

// Canonical digest; six significant digits absorb libm last-place differences between hosts.
export function digest(value: unknown) {
  const json = JSON.stringify(value, (_, item) =>
    typeof item === "number"
      ? Number(item.toPrecision(6))
      : ArrayBuffer.isView(item)
        ? Array.from(item as Float32Array)
        : item,
  );
  return createHash("sha256").update(json).digest("hex").slice(0, 16);
}

export const withoutTiming = (results: { elapsedMs?: number }[]) =>
  results.map((result) => {
    const copy = { ...result };
    delete copy.elapsedMs;
    return copy;
  });
