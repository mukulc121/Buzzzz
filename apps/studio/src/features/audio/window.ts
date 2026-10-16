import { MAX_PATTERN_MS } from "@buzzzz/core";
import type { IAudioSignal, IAudioAnalysisOptions } from "./model";

export function resolveAudioWindow(signal: IAudioSignal, options: IAudioAnalysisOptions = {}) {
  if (!Number.isFinite(signal.sampleRate) || signal.sampleRate < 1000 || signal.sampleRate > 384000)
    throw new Error("Audio sample rate must be between 1,000 and 384,000 Hz");
  if (!signal.channels.length || signal.channels.length > 32)
    throw new Error("Audio must contain between 1 and 32 channels");
  const samples = signal.channels[0].length;
  if (signal.channels.some((channel) => channel.length !== samples))
    throw new Error("Audio channels must have matching lengths");
  for (const value of Object.values(options))
    if (value !== undefined && !Number.isFinite(value))
      throw new Error("Audio analysis settings must be finite numbers");
  const sourceDurationMs = (samples / signal.sampleRate) * 1000;
  const requestedStart = Math.min(sourceDurationMs, Math.max(0, options.offsetMs ?? 0));
  const startSample =
    requestedStart >= sourceDurationMs
      ? samples
      : Math.floor((requestedStart / 1000) * signal.sampleRate);
  const wanted = Math.min(MAX_PATTERN_MS, Math.max(0, options.durationMs ?? sourceDurationMs));
  const remaining = samples - startSample;
  const endSample =
    wanted >= (remaining / signal.sampleRate) * 1000
      ? samples
      : startSample + Math.floor((wanted / 1000) * signal.sampleRate);
  const offsetMs = (startSample / signal.sampleRate) * 1000;
  const durationMs = ((endSample - startSample) / signal.sampleRate) * 1000;
  return {
    sourceDurationMs,
    startSample,
    endSample,
    offsetMs,
    durationMs,
    frameMs: Math.min(100, Math.max(2, options.frameMs ?? 20)),
  };
}

export function resampleAudioWindow(
  signal: IAudioSignal,
  range: ReturnType<typeof resolveAudioWindow>,
  rate: number,
) {
  const length = Math.ceil((range.durationMs * rate) / 1000);
  return signal.channels.map((channel) => {
    const output = new Float32Array(length);
    for (let index = 0; index < length; index++) {
      const start = range.startSample + Math.floor((index * signal.sampleRate) / rate);
      const end = Math.min(
        range.endSample,
        range.startSample +
          Math.max(
            Math.floor(((index + 1) * signal.sampleRate) / rate),
            Math.floor((index * signal.sampleRate) / rate) + 1,
          ),
      );
      let sum = 0;
      for (let sample = start; sample < end; sample++) {
        const value = channel[sample];
        sum += Number.isFinite(value) ? Math.min(1, Math.max(-1, value)) : 0;
      }
      output[index] = sum / Math.max(1, end - start);
    }
    return output;
  });
}
