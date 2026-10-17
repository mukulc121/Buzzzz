import { frameRms } from "../signal/envelope";
import { complexNovelty, pickPeaks } from "../signal/onset";
import { spectrogram } from "../signal/spectrogram";
import { spectralCentroid } from "../signal/spectrum";
import { brightnessToHaptic, rangeToHaptic } from "../generation/frequency";
import type { IAudioClip } from "../model";
import { halveRate, yinPitch } from "./pitch";

const RMS_FRAME_MS = 20;
const PITCH_MIN_HZ = 70;
const PITCH_MAX_HZ = 600;
const DECIMATION = 2;
const PITCH_FRAME = 512;
const PITCH_HOP = 256;
const SPECTRUM_SIZE = 1024;
const SPECTRUM_HOP = SPECTRUM_SIZE / 4;

export interface IVoiceSignal {
  durationMs: number;
  linearRms: Float32Array;
  rmsFrameMs: number;
  pitchAsHapticFrequency: Float32Array;
  pitchFrameMs: number;
  brightnessAsHapticFrequency: Float32Array;
  brightnessFrameMs: number;
  attacks: { timeMs: number; strength: number }[];
  medianPitchHz: number;
  voicedShare: number;
}

function medianVoiced(pitch: Float32Array) {
  const voiced = Array.from(pitch).filter((hz) => hz > 0);
  if (voiced.length === 0) return 0;
  voiced.sort((left, right) => left - right);
  return voiced[voiced.length >> 1];
}

export function analyzeVoice(clip: IAudioClip): IVoiceSignal {
  const { samples, sampleRate, durationMs } = clip;
  const frame = Math.max(1, Math.round((RMS_FRAME_MS / 1000) * sampleRate));
  const hop = Math.max(1, frame >> 1);
  const pitchRate = sampleRate / DECIMATION;
  const pitch = yinPitch(
    halveRate(samples, DECIMATION),
    pitchRate,
    PITCH_FRAME,
    PITCH_HOP,
    PITCH_MIN_HZ,
    PITCH_MAX_HZ,
  );
  const spectrum = spectrogram(samples, sampleRate, SPECTRUM_SIZE, SPECTRUM_HOP);
  const novelty = complexNovelty(samples, SPECTRUM_SIZE, SPECTRUM_HOP);
  return {
    durationMs,
    linearRms: frameRms(samples, frame, hop),
    rmsFrameMs: (hop / sampleRate) * 1000,
    pitchAsHapticFrequency: rangeToHaptic(pitch, PITCH_MIN_HZ, PITCH_MAX_HZ),
    pitchFrameMs: (PITCH_HOP / pitchRate) * 1000,
    brightnessAsHapticFrequency: brightnessToHaptic(spectralCentroid(spectrum)),
    brightnessFrameMs: spectrum.hopMs,
    attacks: pickPeaks(novelty, spectrum.hopMs).map((peak) => ({
      timeMs: spectrum.frameTimeMs(peak.frame),
      strength: peak.strength,
    })),
    medianPitchHz: medianVoiced(pitch),
    voicedShare: pitch.length === 0 ? 0 : pitch.filter((hz) => hz > 0).length / pitch.length,
  };
}
