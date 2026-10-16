import {
  follow,
  frameRms,
  levelAboveFloor,
  normalizePeak,
  resampleSeries,
} from "../../signal/envelope";
import { spectralCentroid } from "../../signal/spectrum";
import type { IStrategy } from "../model";
import { brightnessCurve, intensityCurve } from "../shaping";
import { clipSpectrum } from "./clipAnalysis";

export const rmsEnvelope: IStrategy = {
  id: "rms-envelope",
  name: "RMS envelope",
  summary: "Vibration intensity follows the loudness of the audio.",
  detail:
    "The classic envelope follower: RMS loudness per 20ms frame, on a dB scale, smoothed with a fast attack and slow release. Best on sustained, continuous sound - engines, drones, ambience - where there are no transients to detect. Tends to smear percussion into a rumble.",
  params: [
    { id: "frameMs", label: "Frame", min: 5, max: 50, step: 1, defaultValue: 20, suffix: "ms" },
    {
      id: "releaseMs",
      label: "Release",
      min: 20,
      max: 300,
      step: 5,
      defaultValue: 80,
      suffix: "ms",
    },
    { id: "floorDb", label: "Floor", min: -70, max: -20, step: 1, defaultValue: -50, suffix: "dB" },
  ],
  generate(clip, options, params) {
    const frameMs = params?.frameMs ?? 20;
    const releaseMs = params?.releaseMs ?? 80;
    const floorDb = params?.floorDb ?? -50;
    const { samples, sampleRate, durationMs } = clip;
    const size = Math.max(1, Math.round((frameMs / 1000) * sampleRate));
    const hop = Math.max(1, size >> 1);
    const stepMs = (hop / sampleRate) * 1000;
    const rms = frameRms(samples, size, hop);
    const level = new Float32Array(rms.length);
    for (let frame = 0; frame < rms.length; frame += 1)
      level[frame] = levelAboveFloor(rms[frame], floorDb);
    const envelope = follow(normalizePeak(level), stepMs, 5, releaseMs);
    const intensity = resampleSeries(envelope, stepMs, durationMs, options.envelopeHz);
    const spectrum = clipSpectrum(clip);
    return {
      intensity: intensityCurve(intensity.values, intensity.stepMs, options),
      frequency: brightnessCurve(spectralCentroid(spectrum), spectrum.hopMs, durationMs, options),
      discrete: [],
    };
  },
};
