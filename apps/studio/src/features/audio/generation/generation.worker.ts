import type { GenerationResponse, IGenerationRequest } from "./model";
import { runStrategies } from "./run";

self.addEventListener("message", (event: MessageEvent<IGenerationRequest>) => {
  const { requestId, channels, sampleRate, options, strategyParams } = event.data;
  let response: GenerationResponse;
  try {
    response = {
      requestId,
      ok: true,
      ...runStrategies(channels, sampleRate, options, strategyParams),
    };
  } catch (error) {
    response = {
      requestId,
      ok: false,
      error: error instanceof Error ? error.message : "Analysis failed.",
    };
  }
  self.postMessage(response);
});
