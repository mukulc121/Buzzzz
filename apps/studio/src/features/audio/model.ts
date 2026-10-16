export interface IAudioDecoded {
  sampleRate: number;
  channels: readonly Float32Array[];
  durationMs: number;
}
// Timeline waveform: frame RMS of the trimmed clip.
export interface IAudioAnalysis {
  durationMs: number;
  frames: { timeMs: number; rms: number }[];
}
export interface IAudioClip {
  samples: Float32Array;
  sampleRate: number;
  durationMs: number;
}
