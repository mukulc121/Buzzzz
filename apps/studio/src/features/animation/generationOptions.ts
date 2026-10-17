import type { IAnimationGenerationOptions } from "./model";

export const DEFAULT_ANIMATION_OPTIONS: Required<
  Omit<IAnimationGenerationOptions, "strategyParams">
> = {
  smoothingMs: 12,
  contrast: 0.3,
  gamma: 0.5,
  silenceFloor: 0.05,
  transientDuck: 0.2,
  envelopeHz: 100,
  maxPoints: 240,
  maxEvents: 120,
};
