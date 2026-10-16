import { analyzeAudio } from "./dsp";
import type { AudioAnalysisResponse, IAudioAnalysisRequest } from "./model";

self.addEventListener("message", (event: MessageEvent<IAudioAnalysisRequest>) => {
  let response: AudioAnalysisResponse;
  try {
    const { signal, options, sourceDurationMs, offsetMs } = event.data;
    const analysis = analyzeAudio(signal, options);
    response = {
      analysis: {
        ...analysis,
        sourceDurationMs,
        offsetMs,
        window: { startMs: offsetMs, durationMs: analysis.durationMs },
      },
    };
  } catch (error) {
    response = { error: error instanceof Error ? error.message : "Audio analysis failed" };
  }
  self.postMessage(response);
});
