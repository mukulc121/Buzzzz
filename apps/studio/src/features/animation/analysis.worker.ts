import { analyzeAnimation } from "./analysis";
import type { AnimationAnalysisResponse, IAnimationAnalysisRequest } from "./model";

self.addEventListener("message", (event: MessageEvent<IAnimationAnalysisRequest>) => {
  let response: AnimationAnalysisResponse;
  try {
    response = {
      analysis: analyzeAnimation(event.data.document, event.data.frameMs, event.data.smoothingMs),
    };
  } catch (error) {
    response = { error: error instanceof Error ? error.message : "Animation analysis failed" };
  }
  self.postMessage(response);
});
