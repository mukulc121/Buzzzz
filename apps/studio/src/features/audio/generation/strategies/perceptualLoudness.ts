import { follow, normalizePeak, resampleSeries } from "../../signal/envelope";
import {
  aWeightingDb,
  spectralCentroid,
  vibrotactileWeight,
  weightedEnergy,
} from "../../signal/spectrum";
import { empty } from "../model";
import type { IStrategy } from "../model";
import { brightnessCurve, intensityCurve } from "../shaping";
import { clipSpectrum } from "./clipAnalysis";

const earAndSkin = (hz: number) =>
  (hz > 0 ? 10 ** (aWeightingDb(hz) / 20) : 0) * vibrotactileWeight(hz);

export const perceptualLoudness: IStrategy = {
  id: "perceptual-loudness",
  name: "Perceptual loudness",
  summary: "Weighted by what the ear hears AND what the skin can actually feel.",
  detail:
    "Weights every spectral bin twice before measuring anything: by the A-weighting curve (the ear's sensitivity, so the envelope tracks loudness rather than raw amplitude) and by a vibrotactile curve peaking at 200-250Hz (where the skin's Pacinian receptors are most sensitive). The envelope then tracks how strong a moment would FEEL rather than how loud it measures. Can come out timid on material with little energy in the 100-500Hz range.",
  params: [
    {
      id: "exponent",
      label: "Compression",
      min: 0.2,
      max: 1,
      step: 0.05,
      defaultValue: 1 / 3,
      precision: 2,
    },
    {
      id: "releaseMs",
      label: "Release",
      min: 20,
      max: 300,
      step: 5,
      defaultValue: 90,
      suffix: "ms",
    },
  ],
  generate(clip, options, params) {
    const exponent = params?.exponent ?? 1 / 3;
    const releaseMs = params?.releaseMs ?? 90;
    const { durationMs } = clip;
    const spectrum = clipSpectrum(clip);
    if (spectrum.frames.length === 0) return empty();
    const energy = weightedEnergy(spectrum, earAndSkin);
    const compressed = new Float32Array(energy.length);
    const peak = Math.max(...energy, 1e-9);
    for (let frame = 0; frame < energy.length; frame += 1)
      compressed[frame] = (energy[frame] / peak) ** exponent;
    const envelope = follow(normalizePeak(compressed), spectrum.hopMs, 6, releaseMs);
    const intensity = resampleSeries(envelope, spectrum.hopMs, durationMs, options.envelopeHz);
    return {
      intensity: intensityCurve(intensity.values, intensity.stepMs, options),
      frequency: brightnessCurve(spectralCentroid(spectrum), spectrum.hopMs, durationMs, options),
      discrete: [],
    };
  },
};
