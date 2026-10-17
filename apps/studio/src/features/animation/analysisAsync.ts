import { analyzeAnimation } from "./analysis";
import type {
  AnimationAnalysisResponse,
  IAnimationAnalysis,
  IAnimationAnalysisRequest,
  IAnimationDocument,
} from "./model";

export async function analyzeAnimationAsync(
  document: IAnimationDocument,
  frameMs = 1000 / 240,
  signal?: AbortSignal,
  smoothingMs = 12,
): Promise<IAnimationAnalysis> {
  if (signal?.aborted) throw new DOMException("Animation analysis was cancelled", "AbortError");
  if (typeof Worker === "undefined") return analyzeAnimation(document, frameMs, smoothingMs);
  const request: IAnimationAnalysisRequest = { document, frameMs, smoothingMs };
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./analysis.worker.ts", import.meta.url), { type: "module" });
    const finish = () => {
      worker.terminate();
      signal?.removeEventListener("abort", cancel);
    };
    const cancel = () => {
      finish();
      reject(new DOMException("Animation analysis was cancelled", "AbortError"));
    };
    worker.onmessage = (event: MessageEvent<AnimationAnalysisResponse>) => {
      finish();
      if ("error" in event.data) reject(new Error(event.data.error));
      else resolve(event.data.analysis);
    };
    worker.onerror = (event) => {
      finish();
      reject(new Error(event.message || "Animation analysis failed"));
    };
    worker.onmessageerror = () => {
      finish();
      reject(new Error("Animation analysis could not be read"));
    };
    signal?.addEventListener("abort", cancel, { once: true });
    worker.postMessage(request);
  });
}
