import { follow, levelAboveFloor, normalizePeak, resampleSeries } from "../../signal/envelope";
import { rangeToHaptic } from "../frequency";
import { empty } from "../model";
import type { IStrategy } from "../model";
import { gridFrequencyCurve, intensityCurve } from "../shaping";
import { clipSpectrum } from "./clipAnalysis";

export const melodicTranscode: IStrategy = {
  id: "melodic-transcode",
  name: "Melodic transcode",
  summary: "Follows the melodic contour in the actuator’s frequency band.",
  detail:
    "Tracks the dominant pitch with a harmonic product spectrum (which finds the fundamental even when it isn't present in the signal) and squeezes the whole searched pitch range onto the 60-300Hz band the actuator can play - so the vibration rises and falls with the tune rather than summarizing it. The squeeze is monotonic, so the contour survives while the intervals do not: this follows the shape of a line, it does not transpose it. Made for monophonic, tonal material: a voice, a lead line, a pitched UI sound. On a full mix or on drums the pitch track is meaningless and so is the result.",
  params: [
    {
      id: "pitchMinHz",
      label: "Min pitch",
      min: 30,
      max: 200,
      step: 5,
      defaultValue: 65,
      suffix: "Hz",
    },
    {
      id: "pitchMaxHz",
      label: "Max pitch",
      min: 400,
      max: 4000,
      step: 50,
      defaultValue: 1000,
      suffix: "Hz",
    },
    { id: "harmonics", label: "Harmonics", min: 2, max: 8, step: 1, defaultValue: 4 },
  ],
  generate(clip, options, params) {
    const pitchMinHz = params?.pitchMinHz ?? 65;
    const pitchMaxHz = params?.pitchMaxHz ?? 1000;
    const harmonics = params?.harmonics ?? 4;
    const { durationMs } = clip;
    const spectrum = clipSpectrum(clip);
    if (spectrum.frames.length === 0) return empty();
    const lowBin = Math.max(1, Math.floor(pitchMinHz / spectrum.binHz));
    const highBin = Math.min(spectrum.bins - 1, Math.ceil(pitchMaxHz / spectrum.binHz));
    const pitchHz = new Float32Array(spectrum.frames.length);
    const energy = new Float32Array(spectrum.frames.length);
    for (let frame = 0; frame < spectrum.frames.length; frame += 1) {
      const bins = spectrum.frames[frame];
      let power = 0;
      for (let bin = 0; bin < spectrum.bins; bin += 1) power += bins[bin] * bins[bin];
      energy[frame] = Math.sqrt(power);
      let best = 0;
      let bestBin = 0;
      for (let bin = lowBin; bin <= highBin; bin += 1) {
        let product = bins[bin];
        for (let harmonic = 2; harmonic <= harmonics; harmonic += 1) {
          const index = bin * harmonic;
          if (index >= spectrum.bins) break;
          product *= bins[index];
        }
        if (product > best) {
          best = product;
          bestBin = bin;
        }
      }
      pitchHz[frame] = best > 0 ? bestBin * spectrum.binHz : 0;
    }
    const frequency = rangeToHaptic(pitchHz, pitchMinHz, pitchMaxHz);
    const level = new Float32Array(energy.length);
    for (let frame = 0; frame < energy.length; frame += 1)
      level[frame] = levelAboveFloor(energy[frame], -50);
    const envelope = follow(normalizePeak(level), spectrum.hopMs, 5, 70);
    const intensity = resampleSeries(envelope, spectrum.hopMs, durationMs, options.envelopeHz);
    const pitch = resampleSeries(frequency, spectrum.hopMs, durationMs, options.envelopeHz);
    return {
      intensity: intensityCurve(intensity.values, intensity.stepMs, options),
      frequency: gridFrequencyCurve(pitch.values, pitch.stepMs, options),
      discrete: [],
    };
  },
};
