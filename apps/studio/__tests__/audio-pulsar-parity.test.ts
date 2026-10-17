import { existsSync } from "node:fs";
import { describe, expect, test } from "bun:test";
import { runStrategies } from "../src/features/audio/generation/run";
import { workerClip } from "../src/features/audio/signal/mix";
import { analyzeVoice } from "../src/features/audio/voice/analysis";
import golden from "./fixtures/pulsar-golden.json";
import {
  digest,
  generationCases,
  metricCases,
  voiceCases,
  withoutTiming,
} from "./fixtures/pulsarCases";
import { ORACLE, oracleMetrics, oracleWorker } from "./fixtures/pulsarOracle";

const SLOW = 300000;
const plain = (value: unknown) => JSON.parse(JSON.stringify(value));
const oracle = Object.values(ORACLE).every((path) => existsSync(path));

describe("matches golden outputs of Pulsar Studio's deployed DSP", () => {
  test(
    "every generation strategy",
    () => {
      for (const { name, channels, sampleRate, ...run } of generationCases()) {
        const { results, durationMs } = runStrategies(
          channels,
          sampleRate,
          run.options,
          run.strategyParams,
        );
        expect({ name, digest: digest({ results: withoutTiming(results), durationMs }) }).toEqual({
          name,
          digest: golden.generation[name as keyof typeof golden.generation],
        });
      }
    },
    SLOW,
  );

  test(
    "every signal-analysis metric",
    () => {
      for (const { name, metric, samples, frameMs, params } of metricCases())
        expect({ name, digest: digest(metric.compute(samples, 44100, frameMs, params)) }).toEqual({
          name,
          digest: golden.metrics[name as keyof typeof golden.metrics],
        });
    },
    SLOW,
  );

  test(
    "voice analysis",
    () => {
      for (const { name, channels, sampleRate } of voiceCases())
        expect({ name, digest: digest(analyzeVoice(workerClip(channels, sampleRate))) }).toEqual({
          name,
          digest: golden.voice[name as keyof typeof golden.voice],
        });
    },
    SLOW,
  );
});

describe.skipIf(!oracle)("matches Pulsar Studio's deployed DSP value for value", () => {
  test(
    "generation",
    () => {
      const haptics = oracleWorker(ORACLE.haptics);
      for (const { name, channels, sampleRate, ...run } of generationCases()) {
        const expected = haptics({ requestId: 1, channels, sampleRate, ...run });
        const actual = runStrategies(channels, sampleRate, run.options, run.strategyParams);
        expect({ name, results: plain(withoutTiming(actual.results)) }).toEqual({
          name,
          results: plain(withoutTiming(expected.results as { elapsedMs?: number }[])),
        });
      }
    },
    SLOW,
  );

  test(
    "metrics",
    () => {
      const metrics = oracleMetrics(ORACLE.bundle);
      for (const { name, metric, samples, frameMs, params } of metricCases()) {
        const actual = metric.compute(samples, 44100, frameMs, params);
        const expected = metrics[metric.id].compute(samples, 44100, frameMs, params);
        expect({ name, stepMs: actual.stepMs, values: Array.from(actual.values) }).toEqual({
          name,
          stepMs: expected.stepMs,
          values: Array.from(expected.values),
        });
      }
    },
    SLOW,
  );

  test(
    "voice",
    () => {
      const voice = oracleWorker(ORACLE.voice);
      for (const { name, channels, sampleRate } of voiceCases())
        expect({ name, signal: plain(analyzeVoice(workerClip(channels, sampleRate))) }).toEqual({
          name,
          signal: plain(voice({ requestId: 1, channels, sampleRate }).signal),
        });
    },
    SLOW,
  );
});
