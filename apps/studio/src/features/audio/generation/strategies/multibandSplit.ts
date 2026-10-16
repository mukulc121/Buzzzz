import { follow, levelAboveFloor, normalizePeak, resampleSeries } from "../../signal/envelope";
import { highFrequencyContent, pickPeaks } from "../../signal/onset";
import { bandEnergy } from "../../signal/spectrum";
import { hapticFrequency } from "../frequency";
import { empty } from "../model";
import type { IStrategy } from "../model";
import { discreteEvents, duckUnderEvents, gridFrequencyCurve, intensityCurve } from "../shaping";
import { clipSpectrum } from "./clipAnalysis";

export const multibandSplit: IStrategy = {
  id: "multiband-split",
  name: "Multiband split",
  summary: "Bass drives the intensity; the treble/bass balance drives the frequency.",
  detail:
    "Splits the spectrum into low (20-250Hz), mid and high (2-10kHz) bands. The low band - kick and bass, the part of a mix a body already feels - sets the vibration strength; the high/low balance sets its pitch, so cymbal-heavy moments fizz and bass-heavy ones rumble. Transients come from high-frequency-content onset detection. The best all-rounder on produced music; thin on material with no low end.",
  params: [
    {
      id: "bassReachHz",
      label: "Bass reach",
      min: 120,
      max: 500,
      step: 10,
      defaultValue: 250,
      suffix: "Hz",
    },
    { id: "floorDb", label: "Floor", min: -70, max: -20, step: 1, defaultValue: -45, suffix: "dB" },
    {
      id: "releaseMs",
      label: "Release",
      min: 20,
      max: 300,
      step: 5,
      defaultValue: 70,
      suffix: "ms",
    },
  ],
  generate(clip, options, params) {
    const bassReachHz = params?.bassReachHz ?? 250;
    const floorDb = params?.floorDb ?? -45;
    const releaseMs = params?.releaseMs ?? 70;
    const { durationMs } = clip;
    const spectrum = clipSpectrum(clip);
    if (spectrum.frames.length === 0) return empty();
    const low = bandEnergy(spectrum, 20, bassReachHz);
    const mid = bandEnergy(spectrum, 250, 2000);
    const high = bandEnergy(spectrum, 2000, 10000);
    const level = new Float32Array(low.length);
    for (let frame = 0; frame < low.length; frame += 1)
      level[frame] = levelAboveFloor(low[frame] + 0.25 * mid[frame], floorDb);
    const envelope = follow(normalizePeak(level), spectrum.hopMs, 8, releaseMs);
    const intensity = resampleSeries(envelope, spectrum.hopMs, durationMs, options.envelopeHz);
    const balance = new Float32Array(low.length);
    for (let frame = 0; frame < low.length; frame += 1) {
      const total = low[frame] + mid[frame] + high[frame];
      if (total <= 0) {
        balance[frame] = frame > 0 ? balance[frame - 1] : 0.5;
        continue;
      }
      const brightness = (high[frame] + 0.5 * mid[frame]) / total;
      balance[frame] = hapticFrequency(60 + brightness * 240);
    }
    const frequency = resampleSeries(balance, spectrum.hopMs, durationMs, options.envelopeHz);
    const onsets = pickPeaks(highFrequencyContent(spectrum), spectrum.hopMs).map((peak) => ({
      time: spectrum.frameTimeMs(peak.frame),
      intensity: peak.strength,
      frequency: balance[peak.frame] ?? 0.5,
    }));
    const discrete = discreteEvents(onsets, options);
    duckUnderEvents(intensity.values, intensity.stepMs, discrete, options.transientDuck);
    return {
      intensity: intensityCurve(intensity.values, intensity.stepMs, options),
      frequency: gridFrequencyCurve(frequency.values, frequency.stepMs, options),
      discrete,
    };
  },
};
