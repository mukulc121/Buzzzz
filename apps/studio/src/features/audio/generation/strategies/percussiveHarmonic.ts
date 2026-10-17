import { follow, levelAboveFloor, normalizePeak, resampleSeries } from "../../signal/envelope";
import { medianFilter, pickPeaks } from "../../signal/onset";
import { spectralCentroid } from "../../signal/spectrum";
import { hapticFrequency } from "../frequency";
import { empty } from "../model";
import type { IPulsarEvent, IStrategy } from "../model";
import { brightnessCurve, discreteEvents, duckUnderEvents, intensityCurve, mean } from "../shaping";
import { clipSpectrum } from "./clipAnalysis";

export const percussiveHarmonic: IStrategy = {
  id: "percussive-harmonic",
  name: "Percussive / harmonic split",
  summary: "Separates drums from sustain; each drives its own layer.",
  detail:
    "HPSS (median-filter source separation): on a spectrogram a sustained note is a horizontal ridge and a drum hit is a vertical stripe, so two median filters pull them apart. The percussive half then generates the discrete taps and the harmonic half the continuous envelope - each layer coming from the part of the audio that actually contains it, instead of one being derived from the other. The most faithful on full mixes, and the most expensive to compute.",
  params: [
    { id: "separation", label: "Separation", min: 3, max: 51, step: 2, defaultValue: 17 },
    {
      id: "minPercussiveShare",
      label: "Min percussive share",
      min: 0,
      max: 0.5,
      step: 0.01,
      defaultValue: 0.15,
      precision: 2,
    },
  ],
  generate(clip, options, params) {
    const separation = params?.separation ?? 17;
    const minShare = params?.minPercussiveShare ?? 0.15;
    const { durationMs } = clip;
    const spectrum = clipSpectrum(clip);
    const count = spectrum.frames.length;
    if (count === 0) return empty();
    const harmonic = new Float32Array(count);
    const percussive = new Float32Array(count);
    const column = new Float32Array(count);
    const smoothed = Array.from({ length: count }, () => new Float32Array(spectrum.bins));
    for (let bin = 0; bin < spectrum.bins; bin += 1) {
      for (let frame = 0; frame < count; frame += 1) column[frame] = spectrum.frames[frame][bin];
      const filtered = medianFilter(column, separation);
      for (let frame = 0; frame < count; frame += 1) smoothed[frame][bin] = filtered[frame];
    }
    for (let frame = 0; frame < count; frame += 1) {
      const vertical = medianFilter(spectrum.frames[frame], separation);
      let harmonicPower = 0;
      let percussivePower = 0;
      for (let bin = 0; bin < spectrum.bins; bin += 1) {
        const across = smoothed[frame][bin];
        const along = vertical[bin];
        const total = across + along;
        if (total <= 0) continue;
        const magnitude = spectrum.frames[frame][bin];
        const harmonicPart = magnitude * (across / total);
        const percussivePart = magnitude * (along / total);
        harmonicPower += harmonicPart * harmonicPart;
        percussivePower += percussivePart * percussivePart;
      }
      harmonic[frame] = Math.sqrt(harmonicPower);
      percussive[frame] = Math.sqrt(percussivePower);
    }
    const level = new Float32Array(count);
    for (let frame = 0; frame < count; frame += 1)
      level[frame] = levelAboveFloor(harmonic[frame], -45);
    const envelope = follow(normalizePeak(level), spectrum.hopMs, 10, 110);
    const intensity = resampleSeries(envelope, spectrum.hopMs, durationMs, options.envelopeHz);
    const flux = new Float32Array(count);
    for (let frame = 1; frame < count; frame += 1)
      flux[frame] = Math.max(0, percussive[frame] - percussive[frame - 1]);
    const percussiveMean = mean(percussive);
    const totalMean = percussiveMean + mean(harmonic);
    const share = totalMean > 0 ? percussiveMean / totalMean : 0;
    const peaks = share >= minShare ? pickPeaks(flux, spectrum.hopMs) : [];
    const centroid = spectralCentroid(spectrum);
    const events: IPulsarEvent[] = peaks.map((peak) => ({
      time: spectrum.frameTimeMs(peak.frame),
      intensity: peak.strength,
      frequency: hapticFrequency(centroid[peak.frame] > 0 ? centroid[peak.frame] : 60),
    }));
    const discrete = discreteEvents(events, options);
    duckUnderEvents(intensity.values, intensity.stepMs, discrete, options.transientDuck);
    return {
      intensity: intensityCurve(intensity.values, intensity.stepMs, options),
      frequency: brightnessCurve(centroid, spectrum.hopMs, durationMs, options),
      discrete,
    };
  },
};
