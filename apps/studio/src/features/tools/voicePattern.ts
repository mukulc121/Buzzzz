import type { Pattern } from "@buzzzz/core";
import { generateAudioCandidates } from "../audio/generation";
import type { IAudioAnalysis } from "../audio/model";

export function voicePattern(analysis: IAudioAnalysis): Pattern {
  if (!analysis.frames.some((frame) => frame.rms > 0.0001))
    throw new Error("No voice detected. Check your microphone and record again.");
  const candidates = generateAudioCandidates(analysis);
  const melodic = candidates.find((candidate) => candidate.id === "melodic");
  const transients = candidates.find((candidate) => candidate.id === "transients");
  if (!melodic || !transients) throw new Error("Voice analysis is unavailable");
  return {
    continuousPattern: melodic.pattern.continuousPattern,
    discretePattern: transients.pattern.discretePattern,
  };
}
