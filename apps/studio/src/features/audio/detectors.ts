import type { IAudioAnalysis, IAudioFrame } from "./model";

export function estimatePitch(power: Float32Array, binHz: number, tonality: number) {
  if (tonality < 0.65) return 0;
  let selected = 0;
  let best = 0;
  const last = Math.min(power.length - 2, Math.floor(1000 / binHz));
  for (let bin = Math.max(1, Math.ceil(65 / binHz)); bin <= last; bin++) {
    let score = power[bin];
    for (let harmonic = 2; harmonic <= 4 && bin * harmonic < power.length; harmonic++)
      score += power[bin * harmonic] / harmonic;
    if (score > best) {
      best = score;
      selected = bin;
    }
  }
  if (!selected || best < 1e-12) return 0;
  const left = Math.log(power[selected - 1] + 1e-20);
  const center = Math.log(power[selected] + 1e-20);
  const right = Math.log(power[selected + 1] + 1e-20);
  const denominator = left - 2 * center + right;
  const correction = denominator
    ? Math.max(-0.5, Math.min(0.5, (0.5 * (left - right)) / denominator))
    : 0;
  return (selected + correction) * binHz;
}

export function findOnsets(frames: IAudioFrame[], frameMs: number) {
  const onsets: IAudioAnalysis["onsets"] = [];
  const history = Math.max(3, Math.round(180 / frameMs));
  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    let mean = 0;
    for (let j = Math.max(0, i - history); j < i; j++) mean += frames[j].onsetNovelty;
    mean /= Math.min(history, i) || 1;
    if (frame.rms < 1e-5 || frame.onsetNovelty < Math.max(0.12, mean * 1.5 + 0.04)) continue;
    if (
      frame.onsetNovelty < (frames[i - 1]?.onsetNovelty ?? 0) ||
      frame.onsetNovelty < (frames[i + 1]?.onsetNovelty ?? 0)
    )
      continue;
    const previous = onsets.at(-1);
    if (previous && frame.timeMs - previous.timeMs < 65) {
      if (frame.onsetNovelty > previous.strength)
        onsets[onsets.length - 1] = { timeMs: frame.timeMs, strength: frame.onsetNovelty };
    } else onsets.push({ timeMs: frame.timeMs, strength: frame.onsetNovelty });
  }
  return onsets;
}

export function estimateBeats(
  frames: IAudioFrame[],
  onsets: IAudioAnalysis["onsets"],
  frameMs: number,
  durationMs: number,
) {
  if (onsets.length < 3 || frames.length < 20) return { tempoBpm: null, beatTimesMs: [] };
  const minimum = Math.max(2, Math.round(60000 / 220 / frameMs));
  const maximum = Math.min(Math.floor(frames.length / 2), Math.round(60000 / 45 / frameMs));
  let lag = 0;
  let best = 0;
  for (let candidate = minimum; candidate <= maximum; candidate++) {
    let cross = 0;
    let left = 0;
    let right = 0;
    for (let i = candidate; i < frames.length; i++) {
      const a = frames[i].onsetNovelty;
      const b = frames[i - candidate].onsetNovelty;
      cross += a * b;
      left += a * a;
      right += b * b;
    }
    const bpm = 60000 / (candidate * frameMs);
    const prior = 0.8 + 0.2 * Math.exp(-0.5 * (Math.log2(bpm / 120) / 0.65) ** 2);
    const score = (cross / (Math.sqrt(left * right) + 1e-12)) * prior;
    if (score > best) {
      best = score;
      lag = candidate;
    }
  }
  if (!lag || best < 0.15) return { tempoBpm: null, beatTimesMs: [] };
  let phase = 0;
  let phaseScore = -1;
  for (let offset = 0; offset < lag; offset++) {
    let score = 0;
    for (let i = offset; i < frames.length; i += lag) score += frames[i].onsetNovelty;
    if (score > phaseScore) {
      phaseScore = score;
      phase = offset;
    }
  }
  const beatTimesMs: number[] = [];
  for (let index = phase; index < frames.length; index += lag) {
    const time = index * frameMs;
    if (time < durationMs) beatTimesMs.push(time);
    frames[index].tempoBeat = 1;
  }
  return { tempoBpm: 60000 / (lag * frameMs), beatTimesMs };
}
