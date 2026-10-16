import type { IAudioDecoded } from "./model";
import { readAudioMetadata } from "./metadata";

const decoded = new WeakMap<Blob, Promise<IAudioDecoded>>();
async function decode(file: Blob): Promise<IAudioDecoded> {
  const metadata = await readAudioMetadata(file);
  if (typeof AudioContext === "undefined")
    throw new Error("This browser does not support Web Audio decoding");
  const context = new AudioContext({ sampleRate: 44100 });
  try {
    if (context.sampleRate !== 44100)
      throw new Error("The browser could not use the bounded audio sample rate");
    const buffer = await context.decodeAudioData(await file.arrayBuffer());
    if (buffer.numberOfChannels !== metadata.channels || buffer.duration > 60.05)
      throw new Error("The decoded audio does not match its bounded container metadata");
    return {
      sampleRate: buffer.sampleRate,
      channels: Array.from({ length: buffer.numberOfChannels }, (_, channel) =>
        buffer.getChannelData(channel),
      ),
      durationMs: buffer.duration * 1000,
    };
  } catch {
    throw new Error(
      "The browser could not decode this audio file. Try a supported WAV or MP3 file.",
    );
  } finally {
    await context.close().catch(() => undefined);
  }
}

export function decodeAudioFile(file: Blob): Promise<IAudioDecoded> {
  const cached = decoded.get(file);
  if (cached) return cached;
  const pending = decode(file).catch((error: unknown) => {
    decoded.delete(file);
    throw error;
  });
  decoded.set(file, pending);
  return pending;
}
