import type { IAudioClip } from "../model";

// Channel average decimated to at most 22.05 kHz, as Pulsar's generation worker reads audio.
export function workerClip(channels: readonly Float32Array[], sampleRate: number): IAudioClip {
  if (channels.length === 0 || channels[0].length === 0)
    throw new Error("The audio contains no samples.");
  const length = channels[0].length;
  const factor = Math.max(1, Math.floor(sampleRate / 22050));
  const count = Math.ceil(length / factor);
  const samples = new Float32Array(count);
  const scale = 1 / channels.length;
  for (let source = 0, index = 0; index < count; source += factor, index += 1) {
    let sum = 0;
    for (const channel of channels) sum += channel[source] ?? 0;
    samples[index] = sum * scale;
  }
  return { samples, sampleRate: sampleRate / factor, durationMs: (length / sampleRate) * 1000 };
}

// Full-rate channel mean, as Pulsar's signal analysis reads audio.
export function monoMix(channels: readonly Float32Array[]) {
  const length = channels[0]?.length ?? 0;
  const mono = new Float32Array(length);
  for (const channel of channels)
    for (let index = 0; index < length; index += 1) mono[index] += channel[index];
  if (channels.length > 1)
    for (let index = 0; index < length; index += 1) mono[index] /= channels.length;
  return mono;
}

export function trimWindow(
  samples: Float32Array,
  sampleRate: number,
  startMs: number,
  endMs: number,
) {
  const start = Math.max(0, Math.floor((startMs / 1000) * sampleRate));
  const end = Math.min(samples.length, Math.ceil((endMs / 1000) * sampleRate));
  return end > start ? samples.subarray(start, end) : samples;
}

// Channel copies of a trimmed window, as Pulsar posts them to its workers.
export function trimChannels(
  channels: readonly Float32Array[],
  sampleRate: number,
  startMs: number,
  endMs: number,
) {
  const length = channels[0]?.length ?? 0;
  const start = Math.max(0, Math.floor((startMs / 1000) * sampleRate));
  const end = Math.min(length, Math.ceil((endMs / 1000) * sampleRate));
  return channels.map((channel) => (end > start ? channel.slice(start, end) : channel.slice()));
}
