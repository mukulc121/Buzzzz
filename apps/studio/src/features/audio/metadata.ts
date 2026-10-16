interface IAudioMetadata {
  durationMs: number;
  channels: number;
  sampleRate: number;
}
const MAX_PCM_BYTES = 96 * 1024 * 1024;
const metadata = new WeakMap<Blob, Promise<IAudioMetadata>>();

async function inspectAudio(file: Blob): Promise<IAudioMetadata> {
  if (!file.size || file.size > 20 * 1024 * 1024)
    throw new Error("Audio files must contain data and be 20 MB or smaller");
  await validateWaveContainer(file);
  const { Input, BlobSource, MP4, WAVE, MP3, ADTS, OGG, FLAC } = await import("mediabunny");
  const input = new Input({
    source: new BlobSource(file, { maxCacheSize: 1024 * 1024, useStreamReader: false }),
    formats: [MP4, WAVE, MP3, ADTS, OGG, FLAC],
  });
  try {
    const tracks = await input.getAudioTracks();
    if (tracks.length !== 1) throw new Error("Choose an audio file containing one audio track");
    const track = tracks[0];
    const [duration, channels, sampleRate] = await Promise.all([
      track.computeDuration({ skipLiveWait: true }),
      track.getNumberOfChannels(),
      track.getSampleRate(),
    ]);
    if (!Number.isFinite(duration) || duration <= 0 || duration > 60)
      throw new Error(
        "Audio clips must be 60 seconds or shorter. Trim the source file before importing.",
      );
    if (
      !Number.isInteger(channels) ||
      channels < 1 ||
      channels > 8 ||
      !Number.isFinite(sampleRate) ||
      sampleRate <= 0
    )
      throw new Error("Audio must have valid metadata and no more than 8 channels");
    if (Math.ceil(duration * 48000) * channels * 4 > MAX_PCM_BYTES)
      throw new Error("The decoded audio would exceed the 96 MB PCM limit");
    return { durationMs: duration * 1000, channels, sampleRate };
  } finally {
    input.dispose();
  }
}

export function readAudioMetadata(file: Blob): Promise<IAudioMetadata> {
  const cached = metadata.get(file);
  if (cached) return cached;
  const pending = inspectAudio(file).catch((error: unknown) => {
    metadata.delete(file);
    throw error;
  });
  metadata.set(file, pending);
  return pending;
}
import { validateWaveContainer } from "./wave";
