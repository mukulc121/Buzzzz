import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { AttachedTracks } from "./useAttachedTracks";

export function useMediaPreview(
  library: AttachedTracks["library"],
  onError: (message: string) => void,
  projectId: string | null,
) {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const current = useRef<{ audio: HTMLAudioElement; url: string } | null>(null);
  const generation = useRef(0);
  const stop = useCallback(() => {
    generation.current++;
    const previous = current.current;
    current.current = null;
    previous?.audio.pause();
    if (previous) URL.revokeObjectURL(previous.url);
    setPlayingId(null);
  }, []);
  const filePresent =
    !playingId || !library.ready || library.items.some((item) => item.id === playingId);
  useLayoutEffect(() => stop, [projectId, filePresent, stop]);
  const play = async (id: string) => {
    stop();
    const token = generation.current;
    setPlayingId(id);
    try {
      const file = await library.getFile(id);
      if (token !== generation.current) return;
      if (!file) {
        stop();
        return;
      }
      const url = URL.createObjectURL(file);
      const audio = new Audio(url);
      current.current = { audio, url };
      audio.onended = audio.onpause = () => {
        if (current.current?.audio === audio) stop();
      };
      audio.onerror = () => {
        if (current.current?.audio !== audio) return;
        stop();
        onError("The audio preview could not start. Try another supported audio file.");
      };
      await audio.play();
      if (token !== generation.current) audio.pause();
    } catch {
      if (token !== generation.current) return;
      stop();
      onError("The audio preview could not start. Try another supported audio file.");
    }
  };
  return { playingId, play, stop };
}
