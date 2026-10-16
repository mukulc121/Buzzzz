import type { IGenerationOptions } from "./model";

export const DEFAULT_GENERATION: IGenerationOptions = {
  envelopeHz: 100,
  maxPoints: 240,
  maxEvents: 120,
  silenceFloor: 0.05,
  gamma: 0.5,
  transientDuck: 0.2,
  contrast: 0.3,
};

interface IGenerationSetting {
  key: keyof IGenerationOptions;
  label: string;
  min: number;
  max: number;
  step: number;
  precision: number;
  suffix?: string;
}

// The shared settings Pulsar exposes; maxPoints and maxEvents stay at their defaults.
export const GENERATION_SETTINGS: IGenerationSetting[] = [
  { key: "contrast", label: "Contrast (anti-mush)", min: 0, max: 1, step: 0.05, precision: 2 },
  { key: "gamma", label: "Gamma (perceptual)", min: 0.3, max: 1, step: 0.05, precision: 2 },
  { key: "silenceFloor", label: "Silence floor", min: 0, max: 0.2, step: 0.005, precision: 3 },
  { key: "transientDuck", label: "Transient ducking", min: 0, max: 0.6, step: 0.05, precision: 2 },
  {
    key: "envelopeHz",
    label: "Envelope resolution",
    min: 20,
    max: 200,
    step: 10,
    precision: 0,
    suffix: "Hz",
  },
];

export const GENERATION_INFO =
  "Analyzes the track and derives a haptic pattern from it - several ways at once, as soon as a track is attached and again whenever a setting below changes. Each approach reads the sound differently: some follow its loudness, some tap on every transient, some find the beat. You audition them on the chart and keep the one that feels right.";
