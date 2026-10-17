import { emptyPattern } from "@buzzzz/core";
import type { IAnimationAnalysis, IAnimationCandidate, IAnimationGenerationOptions } from "./model";
import { animationCurve, animationEvents, duckAnimationEnvelope, unit } from "./generationCurves";
import { mapAnimationChannels } from "./channelMapping";
import { physicsImpulse } from "./physicsImpulse";
import { peaks } from "./signals";

const approaches = [
  {
    id: "hybrid",
    label: "Hybrid (energy + impacts)",
    description: "A moving swell with a crisp tap on every impact.",
    approximate: false,
  },
  {
    id: "energy",
    label: "Motion energy",
    description: "A continuous swell that rises and falls with how much is moving.",
    approximate: false,
  },
  {
    id: "kinematic",
    label: "Kinematic transients",
    description: "A tick on every impact: bounces, snaps and sudden stops.",
    approximate: false,
  },
  {
    id: "impulse",
    label: "Physics impulse",
    description:
      "Collisions and landings weighted by mass and momentum, using layer area as a mass proxy.",
    approximate: true,
  },
  {
    id: "channel",
    label: "Channel mapping",
    description: "Each transform channel wired straight to a haptic dimension.",
    approximate: false,
  },
] satisfies Omit<IAnimationCandidate, "pattern" | "pointCount" | "eventCount">[];

export function generateAnimationCandidates(
  analysis: IAnimationAnalysis,
  options: IAnimationGenerationOptions = { smoothingMs: 12 },
): IAnimationCandidate[] {
  for (const [key, value] of Object.entries(options))
    if (key !== "strategyParams" && typeof value === "number" && !Number.isFinite(value))
      throw new Error("Animation generation settings must be finite");
  for (const values of Object.values(options.strategyParams ?? {}))
    for (const value of Object.values(values))
      if (!Number.isFinite(value)) throw new Error("Animation approach settings must be finite");
  const count = analysis.frames.length;
  const sharpness = Float32Array.from(analysis.frames, (frame) =>
    unit(0.6 * frame.acceleration + 0.4 * frame.rotationRate),
  );
  const transient = Float32Array.from(analysis.frames, (frame) => frame.transient);
  return approaches.map((approach) => {
    const pattern = emptyPattern();
    const params = options.strategyParams?.[approach.id] ?? {};
    if (count > 0) {
      if (approach.id === "channel") {
        const mapped = mapAnimationChannels(analysis, params);
        pattern.continuousPattern = {
          amplitude: animationCurve(mapped.amplitude, analysis.frameMs, options),
          frequency: animationCurve(mapped.frequency, analysis.frameMs, options, true),
        };
        pattern.discretePattern = animationEvents(mapped.events, options);
      } else if (approach.id === "impulse") {
        pattern.discretePattern = animationEvents(physicsImpulse(analysis, params), options);
      } else {
        const hybrid = approach.id === "hybrid";
        if (hybrid || approach.id === "kinematic") {
          const threshold = params.threshold ?? (hybrid ? 0.17 : 0.15);
          const gap = params.minGapMs ?? (hybrid ? 70 : 60);
          const floor = hybrid ? 0.25 : (params.floor ?? 0.2);
          const spread = hybrid ? 0.5 : (params.sharpnessSpread ?? 0.6);
          pattern.discretePattern = animationEvents(
            peaks(transient, analysis.frameMs, threshold, gap).map((index) => {
              const time = Math.round(index * analysis.frameMs);
              const sample = Math.min(count - 1, Math.max(0, Math.round(time / analysis.frameMs)));
              return {
                time,
                amplitude: unit(floor + (1 - floor) * transient[index]),
                frequency: unit(0.5 + spread * (0.15 + 0.75 * sharpness[sample] - 0.5)),
              };
            }),
            options,
          );
        }
        if (hybrid || approach.id === "energy") {
          const gain = params.gain ?? (hybrid ? 1.2 : 1.3);
          const follow = params.freqFollow ?? 0.7;
          const amplitude = Float32Array.from(analysis.frames, (frame) =>
            unit(frame.energy * gain),
          );
          const frequency = sharpness.map((value) =>
            unit(0.35 + follow * (0.15 + 0.75 * value - 0.35)),
          );
          if (hybrid)
            duckAnimationEnvelope(
              amplitude,
              analysis.frameMs,
              pattern.discretePattern,
              options.transientDuck ?? 0.2,
            );
          pattern.continuousPattern = {
            amplitude: animationCurve(amplitude, analysis.frameMs, options),
            frequency: animationCurve(frequency, analysis.frameMs, options, true),
          };
        }
      }
    }
    return {
      ...approach,
      pattern,
      pointCount:
        pattern.continuousPattern.amplitude.length + pattern.continuousPattern.frequency.length,
      eventCount: pattern.discretePattern.length,
    };
  });
}
