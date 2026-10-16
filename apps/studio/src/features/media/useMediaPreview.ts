import { useCallback, useEffect, useRef, useState } from "react";
import type { AttachedTracks } from "./useAttachedTracks";

export function useMediaPreview(
  library: AttachedTracks["library"],
  onError: (message: string) => void,
) {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const current = useRef<{ audio: HTMLAudioElement; url: string } | null>(null);
  const generation = useRef(0);
  const stop = useCallback(() => {
    generation.current++;
    current.current?.audio.pause();
    if (current.current) URL.revokeObjectURL(current.current.url);
    current.current = null;
    setPlayingId(null);
  }, []);
  useEffect(() => stop, [stop]);
  useEffect(() => {
    if (playingId && !library.items.some((item) => item.id === playingId))
      current.current?.audio.pause();
  }, [library.items, playingId, stop]);
  const play = async (id: string) => {
    stop();
    const token = generation.current;
    const file = await library.getFile(id);
    if (!file || token !== generation.current) return;
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
    try {
      await audio.play();
      if (token === generation.current) setPlayingId(id);
    } catch {
      if (token !== generation.current) return;
      stop();
      onError("The audio preview could not start. Try another supported audio file.");
    }
  };
  return { playingId, play, stop };
}
