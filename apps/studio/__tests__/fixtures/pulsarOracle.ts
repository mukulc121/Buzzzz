import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

// Pulsar Studio's deployed code is not published under a license, so it is read from disk, never vendored.
export const ORACLE = {
  haptics: process.env.PULSAR_HAPTICS_WORKER ?? "/tmp/pulsar-haptics-worker.js",
  voice: process.env.PULSAR_VOICE_WORKER ?? "/tmp/pulsar-audio-worker.js",
  bundle: process.env.PULSAR_STUDIO_BUNDLE ?? "/tmp/pulsar-studio.js",
};

type Reply = Record<string, unknown>;

export function oracleWorker(path: string) {
  const self: {
    onmessage?: (event: { data: unknown }) => void;
    postMessage: (data: Reply) => void;
  } = { postMessage: () => undefined };
  runInNewContext(readFileSync(path, "utf8"), { self, performance });
  return (data: unknown) => {
    let reply: Reply = {};
    self.postMessage = (value) => (reply = value);
    self.onmessage?.({ data });
    return reply;
  };
}

interface IOracleMetric {
  id: string;
  compute: (
    samples: Float32Array,
    sampleRate: number,
    frameMs: number,
    params: Record<string, number>,
  ) => { stepMs: number; values: Float32Array };
}

// Pulsar's signal-analysis metrics, cut from the main bundle between their first and last helper.
export function oracleMetrics(path: string) {
  const code = readFileSync(path, "utf8");
  const levels = code.slice(code.indexOf("const kue="), code.indexOf("function hg("));
  const metrics = code.slice(code.indexOf("function K5e("), code.indexOf("function ZD("));
  const ids = "hSe,mSe,bSe,SSe,xSe,MSe,ASe,OSe,DSe,qSe,zSe,PSe";
  const list = new Function(`${levels}${metrics}return [${ids}];`)() as IOracleMetric[];
  return Object.fromEntries(list.map((metric) => [metric.id, metric]));
}
