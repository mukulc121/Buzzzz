import type { ICachedMedia, IReceivedMedia } from "./mediaModel";
import { mediaClipPath } from "./mediaPaths";
import { readCachedMedia } from "./mediaStorage";

export function receivedMediaRecord(
  connectionId: string,
  packet: IReceivedMedia,
  receivedAt: number,
): ICachedMedia {
  const clip = packet.type === "audio-haptics" ? packet.audio : packet.animation;
  const clipPath = mediaClipPath(connectionId, clip.clipId, clip.contentType);
  const downloadUrl = new URL(clip.downloadUrl);
  if (!/^[0-9a-f]{64}$/.test(packet.version) || !["http:", "https:"].includes(downloadUrl.protocol))
    throw new Error("The received Studio media resource is invalid");
  return readCachedMedia({
    resourceId: packet.resourceId,
    name: packet.name,
    kind: packet.type === "audio-haptics" ? "audio" : "animation",
    version: packet.version,
    clipId: clip.clipId,
    clipPath,
    contentType: clip.contentType,
    sizeBytes: clip.size,
    durationMs: packet.durationMs,
    pattern: {
      discretePattern: packet.pattern.discretePattern.map((point) => ({ ...point })),
      continuousPattern: {
        amplitude: packet.pattern.continuousPattern.amplitude.map((point) => ({ ...point })),
        frequency: packet.pattern.continuousPattern.frequency.map((point) => ({ ...point })),
      },
    },
    ...(packet.volume !== undefined ? { volume: packet.volume } : {}),
    ...(packet.offsetMs !== undefined ? { offset: packet.offsetMs } : {}),
    ...(packet.window
      ? { soundStartMs: packet.window.startMs, soundDurationMs: packet.window.durationMs }
      : {}),
    ...(packet.type === "animation-haptics"
      ? {
          animation: {
            totalFrames: packet.animation.totalFrames,
            frameRate: packet.animation.frameRate,
            width: packet.animation.width,
            height: packet.animation.height,
          },
        }
      : {}),
    receivedAt,
  });
}
