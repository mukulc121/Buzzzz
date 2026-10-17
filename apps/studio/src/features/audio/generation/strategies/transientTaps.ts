import { pickPeaks } from "../../signal/onset";
import { spectralCentroid, spectralFlatness } from "../../signal/spectrum";
import { hapticFrequency } from "../frequency";
import { empty } from "../model";
import type { IStrategy } from "../model";
import { brightnessCurve, discreteEvents, intensityCurve, stampDecay } from "../shaping";
import { clipNovelty, clipSpectrum } from "./clipAnalysis";

const voicedHz = (hz: number) => (hz > 0 ? hz : 60);

export const transientTaps: IStrategy = {
  id: "transient-taps",
  name: "Transient taps",
  summary: "A discrete tap on every note attack, found by phase prediction.",
  detail:
    "Complex-domain onset detection with an adaptive median threshold: it predicts each frame from the phase of the two before it and measures how far the audio actually lands from that prediction. Produces the rhythm: sharp, separable taps on each hit, with the timbre at that instant (bright vs dark) setting the tap frequency. Best on percussive, rhythmic, or UI-sound material. Sustained audio has no onsets, so it will return nothing for a drone.",
  params: [
    {
      id: "brightnessWeight",
      label: "Brightness weight",
      min: 0,
      max: 1,
      step: 0.05,
      defaultValue: 0.75,
      precision: 2,
    },
    {
      id: "stampDecayMs",
      label: "Tap decay",
      min: 30,
      max: 300,
      step: 5,
      defaultValue: 90,
      suffix: "ms",
    },
  ],
  generate(clip, options, params) {
    const brightnessWeight = params?.brightnessWeight ?? 0.75;
    const decayMs = params?.stampDecayMs ?? 90;
    const { durationMs } = clip;
    const spectrum = clipSpectrum(clip);
    if (spectrum.frames.length === 0) return empty();
    const peaks = pickPeaks(clipNovelty(clip), spectrum.hopMs);
    const centroid = spectralCentroid(spectrum);
    const flatness = spectralFlatness(spectrum);
    const events = peaks.map((peak) => {
      const brightness = hapticFrequency(voicedHz(centroid[peak.frame]));
      const noise = flatness[peak.frame];
      return {
        time: spectrum.frameTimeMs(peak.frame),
        intensity: peak.strength,
        frequency: Math.min(1, brightness * brightnessWeight + noise * (1 - brightnessWeight)),
      };
    });
    const discrete = discreteEvents(events, options);
    const stepMs = 1000 / options.envelopeHz;
    const envelope = new Float32Array(Math.max(1, Math.round(durationMs / stepMs) + 1));
    for (const event of discrete)
      stampDecay(envelope, stepMs, event.time, event.intensity, decayMs);
    return {
      intensity: intensityCurve(envelope, stepMs, options),
      frequency: brightnessCurve(centroid, spectrum.hopMs, durationMs, options),
      discrete,
    };
  },
};
