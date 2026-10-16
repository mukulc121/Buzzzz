import { emptyPattern } from "@buzzzz/core";
import type { Pattern } from "@buzzzz/core";
import { AUDIO_APPROACHES } from "./approaches";
import { addEnvelope, follow, normalize, unit } from "./curves";
import { tuneGeneratedPattern } from "./tuning";

export { AUDIO_APPROACHES } from "./approaches";
import type {
  AudioApproach,
  IAudioAnalysis,
  IAudioCandidate,
  IAudioFrame,
  IAudioGenerationOptions,
} from "./model";

function frameAt(analysis: IAudioAnalysis, timeMs: number): IAudioFrame | undefined {
  return analysis.frames[
    Math.min(analysis.frames.length - 1, Math.max(0, Math.round(timeMs / analysis.frameMs)))
  ];
}

function buildCandidate(
  id: AudioApproach,
  analysis: IAudioAnalysis,
  options: IAudioGenerationOptions,
): Pattern {
  const envelope = (amplitudes: number[], frequencies: number[]) =>
    addEnvelope(pattern, analysis, amplitudes, frequencies, options);
  const pattern = emptyPattern();
  if (!analysis.frames.some((frame) => frame.rms > 1e-5)) return pattern;
  const rms = normalize(analysis.frames.map((frame) => frame.rms));
  const constant = analysis.frames.map(() => 0.35);
  switch (id) {
    case "rms":
      envelope(follow(rms, analysis.frameMs, 20, 80), constant);
      break;
    case "perceptual":
      envelope(
        follow(
          analysis.frames.map((frame) => frame.perceptualLoudness ** 0.7),
          analysis.frameMs,
          15,
          90,
        ),
        analysis.frames.map((frame) => 0.2 + frame.sharpness * 0.6),
      );
      break;
    case "impact":
      envelope(
        normalize(analysis.frames.map((frame) => frame.envelopeFollower)),
        analysis.frames.map((frame) => 0.2 + frame.transientSharpness * 0.65),
      );
      break;
    case "transients":
      pattern.discretePattern = analysis.onsets.map((onset) => ({
        time: onset.timeMs,
        amplitude: unit(onset.strength),
        frequency: 0.25 + (frameAt(analysis, onset.timeMs)?.transientSharpness ?? 0) * 0.65,
      }));
      break;
    case "beats":
      pattern.discretePattern = analysis.beatTimesMs.map((time) => ({
        time,
        amplitude: 0.4 + (frameAt(analysis, time)?.rms ?? 0) * 0.6,
        frequency: 0.35,
      }));
      break;
    case "percussive":
      pattern.discretePattern = analysis.onsets.flatMap((onset) => {
        const frame = frameAt(analysis, onset.timeMs);
        return frame && frame.percussiveShare > 0.25
          ? [
              {
                time: onset.timeMs,
                amplitude: unit(onset.strength * Math.sqrt(frame.percussiveShare)),
                frequency: 0.25 + frame.sharpness * 0.65,
              },
            ]
          : [];
      });
      envelope(
        follow(
          analysis.frames.map((frame, index) => rms[index] * Math.sqrt(1 - frame.percussiveShare)),
          analysis.frameMs,
          30,
          100,
        ),
        analysis.frames.map((frame) => 0.2 + frame.pitch * 0.5),
      );
      break;
    case "multiband": {
      const energy = normalize(
        analysis.frames.map((frame) =>
          Math.sqrt(
            frame.lowEnergy ** 2 + 0.7 * frame.midEnergy ** 2 + 0.3 * frame.highEnergy ** 2,
          ),
        ),
      );
      const frequency = analysis.frames.map((frame) => {
        const sum = frame.lowEnergy + frame.midEnergy + frame.highEnergy;
        return sum > 1e-8
          ? (frame.lowEnergy * 0.15 + frame.midEnergy * 0.5 + frame.highEnergy * 0.9) / sum
          : 0.15;
      });
      envelope(follow(energy, analysis.frameMs, 10, 60), frequency);
      break;
    }
    case "melodic": {
      const pitches = analysis.frames
        .filter((frame) => frame.pitchHz > 0)
        .map((frame) => Math.log2(frame.pitchHz));
      const low = pitches.length ? Math.min(...pitches) : 0;
      const high = pitches.length ? Math.max(...pitches) : 0;
      let previous = 0.5;
      const frequency = analysis.frames.map((frame) => {
        if (frame.pitchHz > 0)
          previous =
            high - low > 0.1
              ? 0.15 + unit((Math.log2(frame.pitchHz) - low) / (high - low)) * 0.7
              : 0.2 + frame.pitch * 0.6;
        return previous;
      });
      envelope(follow(rms, analysis.frameMs, 20, 80), follow(frequency, analysis.frameMs, 35, 35));
      break;
    }
    case "filter-chain":
      envelope(
        follow(
          analysis.frames.map((frame) => frame.vibrotactileLoudness ** 0.6),
          analysis.frameMs,
          5,
          70,
        ),
        analysis.frames.map((frame) => 0.2 + frame.bandEnergy * 0.45),
      );
      break;
  }
  pattern.discretePattern = pattern.discretePattern.filter(
    (tap) => tap.amplitude >= (options.minimumTapStrength ?? 0.12),
  );
  return pattern;
}

export function generateAudioCandidates(
  analysis: IAudioAnalysis,
  options: IAudioGenerationOptions = {},
): IAudioCandidate[] {
  for (const value of Object.values(options))
    if (value !== undefined && !Number.isFinite(value))
      throw new Error("Audio generation settings must be finite numbers");
  return AUDIO_APPROACHES.map((approach) => {
    const pattern = tuneGeneratedPattern(
      buildCandidate(approach.id, analysis, options),
      options,
      analysis.onsets.map((onset) => onset.timeMs),
    );
    return {
      ...approach,
      pattern,
      pointCount:
        pattern.continuousPattern.amplitude.length + pattern.continuousPattern.frequency.length,
      eventCount: pattern.discretePattern.length,
    };
  });
}
