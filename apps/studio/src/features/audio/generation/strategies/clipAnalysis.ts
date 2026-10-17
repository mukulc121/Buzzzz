import { complexNovelty } from "../../signal/onset";
import { spectrogram } from "../../signal/spectrogram";
import type { ISpectrogram } from "../../signal/spectrogram";
import type { IAudioClip } from "../../model";

const SIZE = 1024;
const HOP = SIZE / 4;
const spectra = new WeakMap<Float32Array, ISpectrogram>();
const novelties = new WeakMap<Float32Array, Float32Array>();

// Shared by every strategy in one run, keyed on the clip's samples.
export function clipSpectrum(clip: IAudioClip) {
  let spectrum = spectra.get(clip.samples);
  if (!spectrum) {
    spectrum = spectrogram(clip.samples, clip.sampleRate, SIZE, HOP);
    spectra.set(clip.samples, spectrum);
  }
  return spectrum;
}

export function clipNovelty(clip: IAudioClip) {
  let novelty = novelties.get(clip.samples);
  if (!novelty) {
    novelty = complexNovelty(clip.samples, SIZE, HOP);
    novelties.set(clip.samples, novelty);
  }
  return novelty;
}
