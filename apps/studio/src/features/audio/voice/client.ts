import { workerClip } from "../signal/mix";
import { callWorker } from "../workerCall";
import { analyzeVoice } from "./analysis";
import type { IVoiceSignal } from "./analysis";

let worker: Worker | null = null;
let nextRequest = 1;

export async function analyzeVoiceAsync(channels: Float32Array[], sampleRate: number) {
  if (typeof Worker === "undefined") return analyzeVoice(workerClip(channels, sampleRate));
  worker ??= new Worker(new URL("./voice.worker.ts", import.meta.url), { type: "module" });
  const request = { requestId: nextRequest++, channels, sampleRate };
  const reply = await callWorker<{ signal: IVoiceSignal }>(
    worker,
    request,
    "The voice analysis worker crashed.",
  );
  return reply.signal;
}
