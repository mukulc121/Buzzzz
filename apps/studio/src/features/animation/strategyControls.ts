import type { IAnimationCandidate } from "./model";

interface IAnimationControl {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  unit?: string;
}
const gain = { min: 0.5, max: 3, step: 0.1, unit: "×" };
const threshold = { min: 0.05, max: 0.6, step: 0.01 };
const gap = {
  id: "minGapMs",
  label: "Min gap",
  min: 20,
  max: 300,
  step: 10,
  defaultValue: 70,
  unit: "ms",
};
const follow = {
  id: "freqFollow",
  label: "Frequency follow",
  min: 0,
  max: 1,
  step: 0.05,
  defaultValue: 0.7,
};
const channel = { min: 0, max: 2, step: 0.05, defaultValue: 1 };

export const animationStrategyControls: Record<
  IAnimationCandidate["id"],
  readonly IAnimationControl[]
> = {
  hybrid: [
    { id: "gain", label: "Envelope gain", ...gain, defaultValue: 1.2 },
    { id: "threshold", label: "Impact threshold", ...threshold, defaultValue: 0.17 },
    gap,
    follow,
  ],
  energy: [{ id: "gain", label: "Intensity gain", ...gain, defaultValue: 1.3 }, follow],
  kinematic: [
    { id: "threshold", label: "Detection threshold", ...threshold, defaultValue: 0.15 },
    { ...gap, defaultValue: 60 },
    { id: "floor", label: "Minimum strength", min: 0, max: 0.6, step: 0.05, defaultValue: 0.2 },
    {
      id: "sharpnessSpread",
      label: "Sharpness spread",
      min: 0,
      max: 1,
      step: 0.05,
      defaultValue: 0.6,
    },
  ],
  impulse: [
    { id: "massInfluence", label: "Mass influence", min: 0, max: 1, step: 0.05, defaultValue: 0.5 },
    { id: "threshold", label: "Impact threshold", ...threshold, defaultValue: 0.15 },
    gap,
    { id: "gain", label: "Impulse gain", ...gain, defaultValue: 1.3 },
  ],
  channel: [
    { id: "positionGain", label: "Position → intensity", ...channel },
    { id: "scaleGain", label: "Scale → intensity", ...channel },
    { id: "rotationToIntensity", label: "Rotation → intensity", ...channel },
    { id: "opacityGain", label: "Opacity → intensity", ...channel, defaultValue: 0.6 },
    {
      id: "rotationToFreq",
      label: "Rotation → frequency",
      min: 0,
      max: 1,
      step: 0.05,
      defaultValue: 0.8,
    },
    {
      id: "detentsPerTurn",
      label: "Rotation detents / turn",
      min: 0,
      max: 24,
      step: 1,
      defaultValue: 4,
    },
  ],
};
