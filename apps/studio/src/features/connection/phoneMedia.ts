import { parseMessage, toDevice, type Msg, type Pattern } from "@buzzzz/core";
import { phonePlayback, phoneVersion, type TPhonePreset } from "./phoneLibrary";
import type { TPhoneClip } from "./phoneUpload";

interface IPhoneAudio {
  file: File;
  durationMs: number;
  startMs: number;
  endMs: number;
  volume?: number;
  offsetMs?: number;
}

interface IPhoneAnimation {
  file: File;
  totalFrames: number;
  frameRate: number;
  width: number;
  height: number;
}

export interface IPhoneMedia {
  pattern: Pattern;
  durationMs: number;
  audio?: IPhoneAudio;
  animation?: IPhoneAnimation;
}

interface IPhoneMediaPlayback extends IPhoneMedia {
  remaining: Pattern;
  preset: TPhonePreset;
  upload: (file: File, contentType: string, signal: AbortSignal) => Promise<TPhoneClip>;
  signal: AbortSignal;
}

function checked(message: Msg): Msg {
  const parsed = parseMessage(JSON.stringify(message));
  if (!parsed) throw new Error("Invalid phone media message");
  return parsed;
}

export async function phoneMediaPlayback(options: IPhoneMediaPlayback): Promise<Msg> {
  const { pattern, remaining, preset, durationMs, audio, animation, upload, signal } = options;
  signal.throwIfAborted();
  const device = toDevice(pattern);
  if (animation) {
    try {
      const contentType = /\.lottie$/i.test(animation.file.name)
        ? "application/zip+dotlottie"
        : animation.file.type.split(";")[0]?.trim() || "application/json";
      const clip = await upload(animation.file, contentType, signal);
      const version = await phoneVersion({ pattern: device, clipId: clip.clipId });
      signal.throwIfAborted();
      return checked({
        type: "animation-haptics",
        ...preset,
        durationMs: Math.max(0, Math.round(durationMs)),
        pattern: device,
        version,
        animation: {
          ...clip,
          totalFrames: animation.totalFrames,
          frameRate: animation.frameRate,
          width: animation.width,
          height: animation.height,
        },
      });
    } catch {
      signal.throwIfAborted();
    }
  }
  if (audio) {
    try {
      const clip = await upload(
        audio.file,
        audio.file.type.split(";")[0]?.trim() || "audio/mpeg",
        signal,
      );
      const startMs = Math.round(audio.startMs);
      const windowDurationMs = Math.round(audio.endMs - audio.startMs);
      const window =
        startMs === 0 && windowDurationMs === Math.round(audio.durationMs)
          ? undefined
          : { startMs, durationMs: windowDurationMs };
      const version = await phoneVersion({
        pattern: device,
        clipId: clip.clipId,
        window: window ?? null,
      });
      signal.throwIfAborted();
      return checked({
        type: "audio-haptics",
        ...preset,
        durationMs: Math.max(0, Math.round(durationMs)),
        pattern: device,
        version,
        audio: clip,
        ...(window ? { window } : {}),
        ...(audio.volume !== undefined ? { volume: audio.volume } : {}),
        ...(audio.offsetMs !== undefined ? { offsetMs: audio.offsetMs } : {}),
      });
    } catch {
      signal.throwIfAborted();
    }
  }
  const message = await phonePlayback(remaining, preset);
  signal.throwIfAborted();
  return message;
}
