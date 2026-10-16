import { workerClip } from "../signal/mix";
import { analyzeVoice } from "./analysis";

self.addEventListener(
  "message",
  (event: MessageEvent<{ requestId: number; channels: Float32Array[]; sampleRate: number }>) => {
    const { requestId, channels, sampleRate } = event.data;
    try {
      self.postMessage({
        requestId,
        ok: true,
        signal: analyzeVoice(workerClip(channels, sampleRate)),
      });
    } catch (error) {
      self.postMessage({
        requestId,
        ok: false,
        error: error instanceof Error ? error.message : "Voice analysis failed.",
      });
    }
  },
);
