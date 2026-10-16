import type { AudioApproach } from "./model";

interface IAudioApproach {
  id: AudioApproach;
  label: string;
  description: string;
  approximate: boolean;
}

export const AUDIO_APPROACHES: readonly IAudioApproach[] = [
  {
    id: "rms",
    label: "RMS envelope",
    description: "Smoothed signal energy follows changes in loudness.",
    approximate: false,
  },
  {
    id: "perceptual",
    label: "Perceptual loudness",
    description:
      "A-weighted spectral energy estimates hearing-weighted loudness; this is not calibrated loudness.",
    approximate: true,
  },
  {
    id: "impact",
    label: "Impact follower",
    description: "A sample-level peak envelope catches attacks and releases over 75 ms.",
    approximate: false,
  },
  {
    id: "transients",
    label: "Transient taps",
    description:
      "Adaptive spectral-flux peaks become taps. This estimates attacks without Pulsar's phase-prediction detector.",
    approximate: true,
  },
  {
    id: "beats",
    label: "Beat grid",
    description:
      "Onset autocorrelation estimates a regular beat grid; ambiguous rhythms can produce half or double tempo.",
    approximate: true,
  },
  {
    id: "percussive",
    label: "Percussive / harmonic split",
    description:
      "Time/frequency median masks separate percussive attacks from a sustained envelope.",
    approximate: true,
  },
  {
    id: "multiband",
    label: "Multiband split",
    description: "Low, mid and high spectral energy drive intensity and frequency.",
    approximate: false,
  },
  {
    id: "melodic",
    label: "Melodic transcode",
    description:
      "A harmonic-sum pitch estimate maps melodic contour to haptic frequency; polyphonic pitch is approximate.",
    approximate: true,
  },
  {
    id: "filter-chain",
    label: "Filter-chain estimate",
    description:
      "A tactile-band weighting, compressor and envelope approximate a filter chain. The Android native chain is unavailable in this browser.",
    approximate: true,
  },
];
