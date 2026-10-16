import { analyzeAudio } from "./dsp";
import { resolveAudioWindow } from "./window";
import type {
  AudioAnalysisResponse,
  AudioMetric,
  IAudioAnalysis,
  IAudioAnalysisOptions,
  IAudioAnalysisRequest,
  IAudioSignal,
} from "./model";

export { analyzeAudio } from "./dsp";

interface IAudioAnalysisDescriptor {
  id: AudioMetric;
  label: string;
  description: string;
  approximate: boolean;
}

export const AUDIO_ANALYSES: readonly IAudioAnalysisDescriptor[] = [
  {
    id: "rms",
    label: "RMS energy",
    description: "Root-mean-square sample amplitude, averaged across channels.",
    approximate: false,
  },
  {
    id: "perceptualLoudness",
    label: "Perceptual loudness estimate",
    description:
      "A-weighted spectral energy, normalized within this selection; not calibrated loudness.",
    approximate: true,
  },
  {
    id: "vibrotactileLoudness",
    label: "Vibrotactile loudness estimate",
    description:
      "Spectral energy weighted around 150 Hz, normalized within this selection; not a device response model.",
    approximate: true,
  },
  {
    id: "envelopeFollower",
    label: "Envelope follower",
    description: "Sample-level peak follower with instant attack and 75 ms release.",
    approximate: false,
  },
  {
    id: "bandEnergy",
    label: "Band energy",
    description: "Share of spectral energy in the selected band; defaults to 20–250 Hz.",
    approximate: false,
  },
  {
    id: "roughness",
    label: "Roughness estimate",
    description:
      "20–150 Hz modulation of rectified amplitude, relative to RMS; not a calibrated psychoacoustic model.",
    approximate: true,
  },
  {
    id: "fluctuationStrength",
    label: "Fluctuation strength estimate",
    description:
      "0.5–20 Hz modulation of rectified amplitude; not a calibrated psychoacoustic model.",
    approximate: true,
  },
  {
    id: "sharpness",
    label: "Sharpness estimate",
    description: "High-frequency energy emphasis; not DIN sharpness in acum.",
    approximate: true,
  },
  {
    id: "spectralCentroid",
    label: "Spectral centroid",
    description: "Power-weighted average frequency, scaled to the analysis Nyquist frequency.",
    approximate: false,
  },
  {
    id: "transientSharpness",
    label: "Transient sharpness estimate",
    description: "High-frequency positive spectral flux plus positive RMS change.",
    approximate: true,
  },
  {
    id: "onsetNovelty",
    label: "Onset novelty",
    description: "Positive magnitude spectral flux, normalized within this selection.",
    approximate: false,
  },
  {
    id: "tempoBeat",
    label: "Tempo / beat estimate",
    description:
      "Onset autocorrelation and a regular phase-aligned beat grid; half/double tempo is possible.",
    approximate: true,
  },
  {
    id: "percussiveShare",
    label: "Percussive share estimate",
    description: "Soft time/frequency median masks estimate the percussive share of each spectrum.",
    approximate: true,
  },
  {
    id: "tonality",
    label: "Tonality estimate",
    description:
      "One minus spectral flatness estimates tonal concentration, rather than musical key.",
    approximate: true,
  },
  {
    id: "pitch",
    label: "Pitch estimate",
    description:
      "Harmonic-sum pitch detection, log-scaled from 70 to 600 Hz; polyphonic pitch is approximate.",
    approximate: true,
  },
];

export async function analyzeAudioAsync(
  signal: IAudioSignal,
  options: IAudioAnalysisOptions = {},
  abortSignal?: AbortSignal,
): Promise<IAudioAnalysis> {
  if (abortSignal?.aborted) throw new DOMException("Audio analysis was cancelled", "AbortError");
  const range = resolveAudioWindow(signal, options);
  if (typeof Worker === "undefined") return analyzeAudio(signal, options);
  const channels = signal.channels.map((channel) =>
    channel.slice(range.startSample, range.endSample),
  );
  const request: IAudioAnalysisRequest = {
    signal: { sampleRate: signal.sampleRate, channels },
    options: { ...options, offsetMs: 0, durationMs: 60000 },
    sourceDurationMs: range.sourceDurationMs,
    offsetMs: range.offsetMs,
  };
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./analysis.worker.ts", import.meta.url), { type: "module" });
    const finish = () => {
      worker.terminate();
      abortSignal?.removeEventListener("abort", cancel);
    };
    const cancel = () => {
      finish();
      reject(new DOMException("Audio analysis was cancelled", "AbortError"));
    };
    worker.onmessage = (event: MessageEvent<AudioAnalysisResponse>) => {
      finish();
      if ("error" in event.data) reject(new Error(event.data.error));
      else resolve(event.data.analysis);
    };
    worker.onerror = (event) => {
      finish();
      reject(new Error(event.message || "The audio analysis worker failed"));
    };
    worker.onmessageerror = () => {
      finish();
      reject(new Error("The audio analysis result could not be read"));
    };
    abortSignal?.addEventListener("abort", cancel, { once: true });
    worker.postMessage(
      request,
      channels.map((channel) => channel.buffer),
    );
  });
}
