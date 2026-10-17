import { patternEnd, type Preset } from "@buzzzz/core";
import type { IAnimationDocument } from "../animation/model";
import type { IPhoneMedia } from "./phoneMedia";

interface IDocumentPhoneMedia {
  preset: Pick<Preset, "pattern" | "editor">;
  ready: boolean;
  pending: { audio?: string; animation?: string };
  audio: {
    source: { file: File; durationMs: number } | null;
    trim: { startMs: number; endMs: number };
  };
  animation: { source: { file: File; document: IAnimationDocument; durationMs: number } | null };
}

export function documentPhoneMedia(options: IDocumentPhoneMedia): IPhoneMedia {
  const { preset, ready, pending, audio, animation } = options;
  const audioSource = ready && !pending.audio ? audio.source : null;
  const animationSource = ready && !pending.animation ? animation.source : null;
  const document = animationSource?.document;
  return {
    pattern: preset.pattern,
    durationMs: Math.max(
      patternEnd(preset.pattern),
      preset.editor?.durationMs ?? 0,
      audioSource ? audio.trim.endMs - audio.trim.startMs : 0,
      animationSource?.durationMs ?? 0,
    ),
    ...(audioSource
      ? {
          audio: {
            file: audioSource.file,
            durationMs: audioSource.durationMs,
            startMs: audio.trim.startMs,
            endMs: audio.trim.endMs,
          },
        }
      : {}),
    ...(animationSource && document
      ? {
          animation: {
            file: animationSource.file,
            totalFrames:
              typeof document.data.op === "number"
                ? document.data.op - document.inFrame
                : (document.durationMs * document.frameRate) / 1000,
            frameRate: document.frameRate,
            width: document.width,
            height: document.height,
          },
        }
      : {}),
  };
}
