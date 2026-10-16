import { resolveAudioWindow, resampleAudioWindow } from "./window";
import { estimatePitch, findOnsets, estimateBeats } from "./detectors";
import type { IAudioAnalysis, IAudioAnalysisOptions, IAudioFrame, IAudioSignal } from "./model";
import { createFft } from "./fft";

const unit = (value: number) => Math.min(1, Math.max(0, value));
const median = (a: number, b: number, c: number) =>
  a + b + c - Math.min(a, b, c) - Math.max(a, b, c);

function hearingWeight(frequency: number) {
  const f2 = frequency * frequency;
  const response =
    (12200 ** 2 * f2 * f2) /
    ((f2 + 20.6 ** 2) * Math.sqrt((f2 + 107.7 ** 2) * (f2 + 737.9 ** 2)) * (f2 + 12200 ** 2));
  return (1.2589 * response) ** 2;
}

function normalize(
  frames: IAudioFrame[],
  field: "perceptualLoudness" | "vibrotactileLoudness" | "onsetNovelty" | "transientSharpness",
) {
  let max = 0;
  for (const frame of frames) max = Math.max(max, frame[field]);
  for (const frame of frames) frame[field] = max > 1e-10 ? unit(frame[field] / max) : 0;
}

export function analyzeAudio(
  signal: IAudioSignal,
  options: IAudioAnalysisOptions = {},
): IAudioAnalysis {
  const range = resolveAudioWindow(signal, options);
  const rate = Math.min(24000, signal.sampleRate);
  const hop = Math.max(1, Math.round((rate * range.frameMs) / 1000));
  const frameMs = (hop / rate) * 1000;
  const count = Math.ceil(range.durationMs / frameMs);
  const windowSamples = Math.max(hop, Math.round(rate * 0.04));
  const size = 2 ** Math.ceil(Math.log2(Math.max(64, windowSamples)));
  const bins = size / 2 + 1;
  const fft = createFft(size);
  const power = new Float32Array(bins);
  const previous = new Float32Array(bins);
  const spectra = new Float32Array(count * bins);
  const window = Float64Array.from(
    { length: windowSamples },
    (_, index) => 0.5 - 0.5 * Math.cos((2 * Math.PI * index) / (windowSamples - 1)),
  );
  const weights = Float64Array.from({ length: bins }, (_, bin) =>
    hearingWeight((bin * rate) / size),
  );
  const tactile = Float64Array.from({ length: bins }, (_, bin) =>
    bin ? Math.exp(-0.5 * (Math.log2((bin * rate) / size / 150) / 1.15) ** 2) : 0,
  );
  const bandLow = Math.max(0, options.bandLowHz ?? 20);
  const bandHigh = Math.min(rate / 2, Math.max(bandLow, options.bandHighHz ?? 250));
  const totalSamples = Math.ceil((range.durationMs * rate) / 1000);
  const channels = resampleAudioWindow(signal, range, rate);
  const frames: IAudioFrame[] = [];
  let follower = 0;
  let fastEnvelope = 0;
  let slowEnvelope = 0;
  let roughLow = 0;
  let roughHigh = 0;
  const release = Math.exp(-1 / (rate * 0.075));
  const lowCoefficient = Math.exp((-2 * Math.PI * 0.5) / rate);
  const highCoefficient = Math.exp((-2 * Math.PI * 20) / rate);
  const roughCoefficient = Math.exp((-2 * Math.PI * 150) / rate);
  let previousRms = 0;
  for (let index = 0; index < count; index++) {
    const start = index * hop;
    const end = Math.min(totalSamples, start + hop);
    let square = 0;
    let envelope = 0;
    let roughness = 0;
    let fluctuation = 0;
    for (let sample = start; sample < end; sample++) {
      let energy = 0;
      for (const channel of channels) energy += channel[sample] ** 2;
      energy /= signal.channels.length;
      const amplitude = Math.sqrt(energy);
      square += energy;
      follower = Math.max(amplitude, follower * release);
      envelope += follower;
      fastEnvelope = highCoefficient * fastEnvelope + (1 - highCoefficient) * amplitude;
      slowEnvelope = lowCoefficient * slowEnvelope + (1 - lowCoefficient) * amplitude;
      roughHigh = roughCoefficient * roughHigh + (1 - roughCoefficient) * amplitude;
      roughLow = highCoefficient * roughLow + (1 - highCoefficient) * amplitude;
      roughness += (roughHigh - roughLow) ** 2;
      fluctuation += (fastEnvelope - slowEnvelope) ** 2;
    }
    const length = Math.max(1, end - start);
    const rms = Math.sqrt(square / length);
    const spectrum = spectra.subarray(index * bins, (index + 1) * bins);
    for (const channel of channels) {
      fft.input.fill(0);
      for (let sample = 0; sample < windowSamples; sample++)
        fft.input[sample] = (channel[end - windowSamples + sample] ?? 0) * window[sample];
      fft.power(power);
      for (let bin = 0; bin < bins; bin++) spectrum[bin] += power[bin] / signal.channels.length;
    }
    let energy = 0;
    let weightedFrequency = 0;
    let logPower = 0;
    let hearing = 0;
    let vibration = 0;
    let selectedBand = 0;
    let low = 0;
    let mid = 0;
    let high = 0;
    let flux = 0;
    let sharp = 0;
    for (let bin = 1; bin < bins; bin++) {
      const frequency = (bin * rate) / size;
      const value = spectrum[bin];
      energy += value;
      weightedFrequency += frequency * value;
      logPower += Math.log(value + 1e-20);
      hearing += value * weights[bin];
      vibration += value * tactile[bin];
      if (frequency >= bandLow && frequency <= bandHigh) selectedBand += value;
      if (frequency <= 250) low += value;
      else if (frequency <= 2000) mid += value;
      else high += value;
      const novelty = Math.max(0, Math.sqrt(value) - Math.sqrt(previous[bin]));
      flux += novelty;
      sharp += (novelty * frequency) / (rate / 2);
    }
    const centroidHz = energy > 1e-15 ? weightedFrequency / energy : 0;
    const flatness = energy > 1e-15 ? Math.exp(logPower / (bins - 1)) / (energy / (bins - 1)) : 1;
    const tonality = rms > 1e-5 ? unit(1 - flatness) : 0;
    const pitchHz = rms > 1e-5 ? estimatePitch(spectrum, rate / size, tonality) : 0;
    frames.push({
      timeMs: Math.min(range.durationMs, index * frameMs),
      rms: unit(rms),
      perceptualLoudness: Math.sqrt(hearing),
      vibrotactileLoudness: Math.sqrt(vibration),
      envelopeFollower: unit(envelope / length),
      bandEnergy: energy > 1e-15 ? unit(selectedBand / energy) : 0,
      roughness: unit(Math.sqrt(roughness / length) / Math.max(rms, 0.02)),
      fluctuationStrength: unit(Math.sqrt(fluctuation / length)),
      sharpness: energy > 1e-15 ? unit((high + 0.3 * mid) / energy) : 0,
      spectralCentroid: unit(centroidHz / (rate / 2)),
      spectralCentroidHz: centroidHz,
      transientSharpness: sharp + Math.max(0, rms - previousRms),
      onsetNovelty: rms > 1e-5 ? flux : 0,
      tempoBeat: 0,
      percussiveShare: 0,
      tonality,
      pitchHz,
      pitch: pitchHz ? unit(Math.log2(pitchHz / 70) / Math.log2(600 / 70)) : 0,
      lowEnergy: unit(Math.sqrt(low)),
      midEnergy: unit(Math.sqrt(mid)),
      highEnergy: unit(Math.sqrt(high)),
    });
    previous.set(spectrum);
    previousRms = rms;
  }
  for (let index = 0; index < count; index++) {
    let total = 0;
    let percussive = 0;
    for (let bin = 1; bin < bins - 1; bin++) {
      const value = spectra[index * bins + bin];
      const harmonicMedian = median(
        spectra[Math.max(0, index - 1) * bins + bin],
        value,
        spectra[Math.min(count - 1, index + 1) * bins + bin],
      );
      const percussiveMedian = median(
        spectra[index * bins + bin - 1],
        value,
        spectra[index * bins + bin + 1],
      );
      const mask = percussiveMedian ** 2 / (harmonicMedian ** 2 + percussiveMedian ** 2 + 1e-30);
      total += value;
      percussive += value * mask;
    }
    frames[index].percussiveShare = total > 1e-15 ? unit(percussive / total) : 0;
  }
  normalize(frames, "perceptualLoudness");
  normalize(frames, "vibrotactileLoudness");
  normalize(frames, "onsetNovelty");
  normalize(frames, "transientSharpness");
  const onsets = findOnsets(frames, frameMs);
  const beats = estimateBeats(frames, onsets, frameMs, range.durationMs);
  return {
    sourceDurationMs: range.sourceDurationMs,
    offsetMs: range.offsetMs,
    durationMs: range.durationMs,
    frameMs,
    analysisSampleRate: rate,
    window: { startMs: range.offsetMs, durationMs: range.durationMs },
    frames,
    onsets,
    ...beats,
  };
}
