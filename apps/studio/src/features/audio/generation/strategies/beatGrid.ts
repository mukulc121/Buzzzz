import { isPeaked } from "../../signal/onset";
import { bandEnergy, spectralCentroid } from "../../signal/spectrum";
import { hapticFrequency } from "../frequency";
import { empty } from "../model";
import type { IPulsarEvent, IStrategy } from "../model";
import { brightnessCurve, discreteEvents, intensityCurve, stampDecay } from "../shaping";
import { clipNovelty, clipSpectrum } from "./clipAnalysis";

export const beatGrid: IStrategy = {
  id: "beat-grid",
  name: "Beat grid",
  summary: "Finds the tempo and taps on every beat, accenting the downbeat.",
  detail:
    "Estimates the tempo by autocorrelating the onset novelty, then lays a beat grid over the whole clip and taps on it - accenting every fourth beat. Unlike transient detection it is faithful to the PULSE rather than to the audio: it fills in a beat the performance dropped and ignores anything off the grid, so the pattern feels intentional instead of twitchy. Requires a steady tempo - on speech, ambience or sound effects the tempo it 'finds' is fiction.",
  params: [
    {
      id: "minBpm",
      label: "Min tempo",
      min: 40,
      max: 120,
      step: 1,
      defaultValue: 60,
      suffix: "BPM",
    },
    {
      id: "maxBpm",
      label: "Max tempo",
      min: 120,
      max: 300,
      step: 1,
      defaultValue: 190,
      suffix: "BPM",
    },
    { id: "beatsPerBar", label: "Beats per bar", min: 2, max: 8, step: 1, defaultValue: 4 },
    {
      id: "audioFollow",
      label: "Audio follow",
      min: 0,
      max: 0.6,
      step: 0.05,
      defaultValue: 0.35,
      precision: 2,
    },
  ],
  generate(clip, options, params) {
    const minBpm = params?.minBpm ?? 60;
    const maxBpm = params?.maxBpm ?? 190;
    const beatsPerBar = params?.beatsPerBar ?? 4;
    const audioFollow = params?.audioFollow ?? 0.35;
    const { durationMs } = clip;
    const spectrum = clipSpectrum(clip);
    if (spectrum.frames.length < 8) return empty();
    const novelty = clipNovelty(clip);
    if (!isPeaked(novelty)) return empty();
    const minLag = Math.max(1, Math.round(60000 / maxBpm / spectrum.hopMs));
    const maxLag = Math.min(novelty.length - 1, Math.round(60000 / minBpm / spectrum.hopMs));
    if (maxLag <= minLag) return empty();
    let period = minLag;
    let best = -Infinity;
    for (let lag = minLag; lag <= maxLag; lag += 1) {
      let sum = 0;
      for (let index = lag; index < novelty.length; index += 1)
        sum += novelty[index] * novelty[index - lag];
      const score = sum / (novelty.length - lag);
      if (score > best) {
        best = score;
        period = lag;
      }
    }
    const beatMs = period * spectrum.hopMs;
    if (!Number.isFinite(beatMs) || beatMs <= 0) return empty();
    let phase = 0;
    let strongest = -Infinity;
    for (let offset = 0; offset < period; offset += 1) {
      let sum = 0;
      for (let index = offset; index < novelty.length; index += period) sum += novelty[index];
      if (sum > strongest) {
        strongest = sum;
        phase = offset;
      }
    }
    const bass = bandEnergy(spectrum, 20, 250);
    let bassPeak = 0;
    for (const value of bass) if (value > bassPeak) bassPeak = value;
    const beats: IPulsarEvent[] = [];
    let beat = 0;
    for (let frame = phase; frame < novelty.length; frame += period, beat += 1) {
      const downbeat = beat % beatsPerBar === 0;
      const follow = bassPeak > 0 ? bass[frame] / bassPeak : 0;
      const intensity = Math.min(1, (downbeat ? 0.75 : 0.45) + audioFollow * follow);
      beats.push({
        time: spectrum.frameTimeMs(frame),
        intensity,
        frequency: hapticFrequency(downbeat ? 80 : 160),
      });
    }
    const discrete = discreteEvents(beats, options);
    const stepMs = 1000 / options.envelopeHz;
    const envelope = new Float32Array(Math.max(1, Math.round(durationMs / stepMs) + 1));
    for (const event of discrete) stampDecay(envelope, stepMs, event.time, event.intensity, 70);
    return {
      intensity: intensityCurve(envelope, stepMs, options),
      frequency: brightnessCurve(spectralCentroid(spectrum), spectrum.hopMs, durationMs, options),
      discrete,
    };
  },
};
