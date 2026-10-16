import { useCallback, useEffect, useRef } from "react";
import type { useAudioTrack } from "../audio/useAudioTrack";
import type { useAnimationTrack } from "../animation/useAnimationTrack";
import type { useRiveSession } from "../rive/useRiveSession";
import type { IMediaTrim, MediaKind } from "./model";
import { readRiveFile } from "./attachments";
import { toMediaError } from "./rules";

export interface IAttachmentCodecs {
  audio: Pick<ReturnType<typeof useAudioTrack>, "loadFile" | "clear" | "source" | "trim">;
  animation: Pick<ReturnType<typeof useAnimationTrack>, "loadFile" | "clear">;
  rive: Pick<ReturnType<typeof useRiveSession>, "setRiv">;
  onError: (message: string) => void;
}

export function useAttachmentLoader(props: IAttachmentCodecs) {
  const { audio, animation, rive, onError } = props;
  const { loadFile: loadAudio, clear: clearAudio } = audio;
  const { loadFile: loadAnimation, clear: clearAnimation } = animation;
  const { setRiv } = rive;
  const errorHandler = useRef(onError);
  useEffect(() => {
    errorHandler.current = onError;
  }, [onError]);
  const clearKind = useCallback(
    (kind: MediaKind) => {
      if (kind === "audio") clearAudio();
      else if (kind === "animation") clearAnimation();
      else setRiv(null);
    },
    [clearAudio, clearAnimation, setRiv],
  );
  const load = useCallback(
    async (kind: MediaKind, file: File, trim: IMediaTrim | null, current: () => boolean) => {
      if (kind === "audio") return loadAudio(file, trim ?? undefined);
      if (kind === "animation") return loadAnimation(file);
      try {
        const buffer = await readRiveFile(file);
        if (!current()) return false;
        setRiv({ name: file.name, buffer });
        return true;
      } catch (error) {
        if (current()) errorHandler.current(toMediaError(error).message);
        return false;
      }
    },
    [loadAudio, loadAnimation, setRiv],
  );
  return { clearKind, load };
}
