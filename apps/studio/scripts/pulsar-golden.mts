// Regenerates __tests__/fixtures/pulsar-golden.json from Pulsar Studio's deployed workers.
// Usage: PULSAR_HAPTICS_WORKER=… PULSAR_VOICE_WORKER=… PULSAR_STUDIO_BUNDLE=… bun scripts/pulsar-golden.mts
import { writeFileSync } from "node:fs";
import {
  digest,
  generationCases,
  metricCases,
  voiceCases,
  withoutTiming,
} from "../__tests__/fixtures/pulsarCases.ts";
import { ORACLE, oracleMetrics, oracleWorker } from "../__tests__/fixtures/pulsarOracle.ts";

const haptics = oracleWorker(ORACLE.haptics);
const voice = oracleWorker(ORACLE.voice);
const metrics = oracleMetrics(ORACLE.bundle);

const golden = {
  generation: Object.fromEntries(
    generationCases().map(({ name, channels, sampleRate, ...run }) => {
      const reply = haptics({ requestId: 1, channels, sampleRate, ...run });
      const results = withoutTiming(reply.results as { elapsedMs?: number }[]);
      return [name, digest({ results, durationMs: reply.durationMs })];
    }),
  ),
  metrics: Object.fromEntries(
    metricCases().map(({ name, metric, samples, frameMs, params }) => [
      name,
      digest(metrics[metric.id].compute(samples, 44100, frameMs, params)),
    ]),
  ),
  voice: Object.fromEntries(
    voiceCases().map(({ name, channels, sampleRate }) => [
      name,
      digest(voice({ requestId: 1, channels, sampleRate }).signal),
    ]),
  ),
};

writeFileSync(
  new URL("../__tests__/fixtures/pulsar-golden.json", import.meta.url),
  `${JSON.stringify(golden, null, 2)}\n`,
);
