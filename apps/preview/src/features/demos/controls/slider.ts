import { clamp01 } from "../shared/patterns";

export const STEPS = 20;

export const valueAt = (x: number, width: number) => (width > 0 ? clamp01(x / width) : 0);
export const stepOf = (value: number) => Math.round(clamp01(value) * STEPS);

// Higher on the track feels stronger and higher-pitched.
export const stepFeel = (step: number) => ({
  amplitude: Math.round((0.25 + 0.75 * (step / STEPS)) * 100) / 100,
  frequency: Math.round((0.15 + 0.8 * (step / STEPS)) * 100) / 100,
});
