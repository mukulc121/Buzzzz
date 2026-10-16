import { useCallback, useEffect, useRef, useState } from "react";

export function useAudioPreview(
  url: string | undefined,
  startMs: number,
  endMs: number,
  onError: (message: string) => void,
) {
  const element = useRef<HTMLAudioElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const stopPreview = useCallback(() => {
    element.current?.pause();
    clearTimeout(timer.current);
    setPlayingUrl(null);
  }, []);
  useEffect(() => {
    if (!url) return;
    const audio = new Audio(url);
    element.current = audio;
    const stop = () => {
      clearTimeout(timer.current);
      setPlayingUrl(null);
    };
    audio.addEventListener("ended", stop);
    audio.addEventListener("pause", stop);
    return () => {
      audio.pause();
      audio.removeEventListener("ended", stop);
      audio.removeEventListener("pause", stop);
      element.current = null;
      clearTimeout(timer.current);
    };
  }, [url]);
  useEffect(() => {
    element.current?.pause();
    clearTimeout(timer.current);
  }, [startMs, endMs]);
  const preview = useCallback(async () => {
    const audio = element.current;
    if (!audio || !url || endMs <= startMs) return;
    stopPreview();
    audio.currentTime = startMs / 1000;
    try {
      await audio.play();
      if (element.current !== audio) return;
      setPlayingUrl(url);
      timer.current = setTimeout(stopPreview, Math.max(0, endMs - audio.currentTime * 1000));
    } catch {
      onError("The audio preview could not start. Try another supported audio file.");
    }
  }, [url, startMs, endMs, stopPreview, onError]);
  return { preview, stopPreview, previewing: Boolean(url && playingUrl === url) };
}
