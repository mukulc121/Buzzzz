import { emptyPattern } from "@buzzzz/core";
import type { Pattern } from "@buzzzz/core";
import type { IAnimationAnalysis, IAnimationCandidate, IAnimationGenerationOptions } from "./model";
import { tuneGeneratedPattern } from "../audio/tuning";

const ANIMATION_APPROACHES: readonly Omit<
  IAnimationCandidate,
  "pattern" | "pointCount" | "eventCount"
>[] = [
  {
    id: "hybrid",
    label: "Hybrid (energy + impacts)",
    description: "A motion-energy envelope with taps at rapid velocity changes.",
    approximate: true,
  },
  {
    id: "energy",
    label: "Motion energy",
    description: "Area-weighted translation, rotation and scale velocity form a continuous swell.",
    approximate: true,
  },
  {
    id: "kinematic",
    label: "Kinematic transients",
    description: "Acceleration peaks and direction changes become discrete taps.",
    approximate: true,
  },
  {
    id: "impulse",
    label: "Physics impulse estimate",
    description:
      "Velocity changes weighted by visible bounds estimate momentum; Lottie supplies neither real mass nor collision geometry.",
    approximate: true,
  },
  {
    id: "channel",
    label: "Channel mapping",
    description:
      "Selected normalized transform or motion channels map directly to intensity and frequency.",
    approximate: false,
  },
];
const unit = (value: number) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
function smooth(values: number[], width: number) {
  const output: number[] = [];
  let sum = 0;
  for (let index = 0; index < values.length; index++) {
    sum += values[index];
    if (index >= width) sum -= values[index - width];
    output.push(sum / Math.min(index + 1, width));
  }
  return output;
}
function curve(
  analysis: IAnimationAnalysis,
  values: number[],
  endValue: number,
): Pattern["continuousPattern"]["amplitude"] {
  const points: Pattern["continuousPattern"]["amplitude"] = [];
  const stride = Math.max(1, Math.ceil(analysis.frames.length / 4999));
  for (let start = 0; start < values.length; start += stride) {
    const end = Math.min(values.length, start + stride);
    let low = start;
    let high = start;
    for (let index = start + 1; index < end; index++) {
      if (values[index] < values[low]) low = index;
      if (values[index] > values[high]) high = index;
    }
    for (const index of low === high ? [low] : [Math.min(low, high), Math.max(low, high)]) {
      const point = { time: analysis.frames[index].timeMs, value: unit(values[index]) };
      const previous = points.at(-1);
      const before = points.at(-2);
      if (previous && before) {
        const expected =
          before.value +
          ((point.value - before.value) * (previous.time - before.time)) /
            Math.max(1e-8, point.time - before.time);
        if (Math.abs(expected - previous.value) < 0.005) points.pop();
      }
      points.push(point);
    }
  }
  points.push({ time: analysis.durationMs, value: unit(endValue) });
  return points;
}

export function generateAnimationCandidates(
  analysis: IAnimationAnalysis,
  options: IAnimationGenerationOptions = {
    smoothingMs: 12,
    intensityChannel: "energy",
    frequencyChannel: "positionY",
  },
): IAnimationCandidate[] {
  for (const value of [
    options.smoothingMs,
    options.gain,
    options.threshold,
    options.minGapMs,
    options.freqFollow,
  ])
    if (value !== undefined && !Number.isFinite(value))
      throw new Error("Animation generation settings must be finite");
  const width = Math.max(1, Math.min(240, Math.round(options.smoothingMs / analysis.frameMs)));
  const energy = smooth(
    analysis.frames.map((frame) => frame.energy),
    width,
  );
  const gain = Math.max(0.5, Math.min(3, options.gain ?? 1.2));
  const threshold = Math.max(0.05, Math.min(0.6, options.threshold ?? 0.17));
  const gap = Math.max(20, Math.min(300, options.minGapMs ?? 70));
  const follow = unit(options.freqFollow ?? 0.7);
  const impacts: IAnimationAnalysis["impacts"] = [];
  for (const impact of analysis.impacts) {
    if (impact.strength < threshold) continue;
    const previous = impacts.at(-1);
    if (previous && impact.timeMs - previous.timeMs < gap) {
      if (impact.strength > previous.strength) impacts[impacts.length - 1] = impact;
    } else impacts.push(impact);
  }
  const moving = analysis.frames.some((frame) => frame.energy > 1e-8);
  const channelsVary = analysis.frames.some(
    (frame) =>
      frame[options.intensityChannel] !== analysis.frames[0]?.[options.intensityChannel] ||
      frame[options.frequencyChannel] !== analysis.frames[0]?.[options.frequencyChannel],
  );
  return ANIMATION_APPROACHES.map((approach) => {
    let pattern = emptyPattern();
    if (moving || (approach.id === "channel" && channelsVary)) {
      if (approach.id === "hybrid" || approach.id === "energy" || approach.id === "channel") {
        const amplitudes =
          approach.id === "channel"
            ? smooth(
                analysis.frames.map((frame) => frame[options.intensityChannel]),
                width,
              )
            : energy.map((value) => unit(value * (approach.id === "hybrid" ? gain : 1)));
        const frequencies =
          approach.id === "channel"
            ? smooth(
                analysis.frames.map((frame) => frame[options.frequencyChannel]),
                width,
              )
            : analysis.frames.map(
                (frame) => 0.35 * (1 - follow) + (0.2 + frame.velocity * 0.6) * follow,
              );
        pattern.continuousPattern = {
          amplitude: curve(analysis, amplitudes, 0),
          frequency: curve(analysis, frequencies, frequencies.at(-1) ?? 0.5),
        };
      }
      if (approach.id === "hybrid" || approach.id === "kinematic" || approach.id === "impulse")
        pattern.discretePattern = impacts.map((impact) => ({
          time: impact.timeMs,
          amplitude: unit(approach.id === "impulse" ? impact.momentum : impact.strength),
          frequency: approach.id === "impulse" ? 0.25 : 0.65,
        }));
      pattern = tuneGeneratedPattern(
        pattern,
        options,
        impacts.map((impact) => impact.timeMs),
      );
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
