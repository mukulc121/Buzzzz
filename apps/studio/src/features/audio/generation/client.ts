import { callWorker } from "../workerCall";
import type {
  IGenerationOptions,
  IGenerationRequest,
  IStrategyResult,
  StrategyParams,
} from "./model";
import { runStrategies } from "./run";

let worker: Worker | null = null;
let nextRequest = 1;

// Posts trimmed channels to the shared generation worker; resolves with every strategy's result.
export function generate(
  channels: Float32Array[],
  sampleRate: number,
  options: IGenerationOptions,
  strategyParams: StrategyParams,
) {
  if (typeof Worker === "undefined")
    return Promise.resolve(runStrategies(channels, sampleRate, options, strategyParams));
  worker ??= new Worker(new URL("./generation.worker.ts", import.meta.url), { type: "module" });
  const request: IGenerationRequest = {
    requestId: nextRequest++,
    channels,
    sampleRate,
    options,
    strategyParams,
  };
  return callWorker<{ results: IStrategyResult[]; durationMs: number }>(
    worker,
    request,
    "The analysis worker crashed.",
  );
}
