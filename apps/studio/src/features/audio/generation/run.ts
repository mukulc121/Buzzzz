import { workerClip } from "../signal/mix";
import { empty } from "./model";
import type { IGenerationOptions, IStrategyResult, StrategyParams } from "./model";
import { DEFAULT_GENERATION } from "./options";
import { STRATEGIES } from "./strategies";

// Runs every strategy; one failing strategy reports its error instead of failing the run.
export function runStrategies(
  channels: Float32Array[],
  sampleRate: number,
  options: IGenerationOptions = DEFAULT_GENERATION,
  strategyParams?: StrategyParams,
) {
  const clip = workerClip(channels, sampleRate);
  const results = STRATEGIES.map((strategy): IStrategyResult => {
    const started = performance.now();
    const descriptor = {
      strategyId: strategy.id,
      name: strategy.name,
      summary: strategy.summary,
      detail: strategy.detail,
    };
    try {
      const pattern = strategy.generate(clip, options, strategyParams?.[strategy.id]);
      return { ...descriptor, pattern, elapsedMs: Math.round(performance.now() - started) };
    } catch (error) {
      return {
        ...descriptor,
        pattern: empty(),
        elapsedMs: Math.round(performance.now() - started),
        error: error instanceof Error ? error.message : "Strategy failed.",
      };
    }
  });
  return { results, durationMs: clip.durationMs };
}
