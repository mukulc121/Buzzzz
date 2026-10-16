import type { Pattern } from "@buzzzz/core";

export interface IAudioSignal {
  sampleRate: number;
  channels: readonly Float32Array[];
}
export interface IAudioDecoded extends IAudioSignal {
  durationMs: number;
}
export interface IAudioAnalysisOptions {
  offsetMs?: number;
  durationMs?: number;
  frameMs?: number;
  bandLowHz?: number;
  bandHighHz?: number;
}
export interface IAudioFrame {
  timeMs: number;
  rms: number;
  perceptualLoudness: number;
  vibrotactileLoudness: number;
  envelopeFollower: number;
  bandEnergy: number;
  roughness: number;
  fluctuationStrength: number;
  sharpness: number;
  spectralCentroid: number;
  transientSharpness: number;
  onsetNovelty: number;
  tempoBeat: number;
  percussiveShare: number;
  tonality: number;
  pitch: number;
  spectralCentroidHz: number;
  pitchHz: number;
  lowEnergy: number;
  midEnergy: number;
  highEnergy: number;
}
export type AudioMetric = keyof Omit<
  IAudioFrame,
  "timeMs" | "spectralCentroidHz" | "pitchHz" | "lowEnergy" | "midEnergy" | "highEnergy"
>;
export interface IAudioAnalysis {
  sourceDurationMs: number;
  offsetMs: number;
  durationMs: number;
  frameMs: number;
  analysisSampleRate: number;
  window: { startMs: number; durationMs: number };
  frames: IAudioFrame[];
  tempoBpm: number | null;
  beatTimesMs: number[];
  onsets: { timeMs: number; strength: number }[];
}
export type AudioApproach =
  | "rms"
  | "perceptual"
  | "impact"
  | "transients"
  | "beats"
  | "percussive"
  | "multiband"
  | "melodic"
  | "filter-chain";
export interface IAudioCandidate {
  id: AudioApproach;
  label: string;
  description: string;
  approximate: boolean;
  pattern: Pattern;
  pointCount: number;
  eventCount: number;
}
export interface IAudioGenerationOptions {
  intensity?: number;
  frequencyShift?: number;
  smoothingMs?: number;
  reductionTolerance?: number;
  minimumTapStrength?: number;
  contrast?: number;
  gamma?: number;
  silenceFloor?: number;
  transientDuck?: number;
  envelopeHz?: number;
  maxPoints?: number;
  maxEvents?: number;
}
export interface IAudioAnalysisRequest {
  signal: IAudioSignal;
  options: IAudioAnalysisOptions;
  sourceDurationMs: number;
  offsetMs: number;
}
export type AudioAnalysisResponse = { analysis: IAudioAnalysis } | { error: string };
