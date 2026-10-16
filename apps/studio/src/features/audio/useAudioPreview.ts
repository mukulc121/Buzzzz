import { useCallback, useEffect, useRef, useState } from "react";

export function useAudioPreview(
  url: string | undefined,
  startMs: number,
  endMs: number,
  onError: (message: string) => void,
) {
  const element = useRef<HTMLAudioElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const run = useRef(0);
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const cancelPreview = useCallback(() => {
    run.current++;
    element.current?.pause();
    clearTimeout(timer.current);
  }, []);
  const stopPreview = useCallback(() => {
    cancelPreview();
    setPlayingUrl(null);
  }, [cancelPreview]);
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
      cancelPreview();
      audio.removeEventListener("ended", stop);
      audio.removeEventListener("pause", stop);
      element.current = null;
    };
  }, [url, cancelPreview]);
  useEffect(() => {
    cancelPreview();
  }, [startMs, endMs, cancelPreview]);
  const preview = useCallback(async () => {
    const audio = element.current;
    if (!audio || !url || endMs <= startMs) return;
    stopPreview();
    const id = run.current;
    audio.currentTime = startMs / 1000;
    try {
      await audio.play();
      if (element.current !== audio || id !== run.current) return;
      setPlayingUrl(url);
      timer.current = setTimeout(stopPreview, Math.max(0, endMs - audio.currentTime * 1000));
    } catch {
      if (element.current === audio && id === run.current)
        onError("The audio preview could not start. Try another supported audio file.");
    }
  }, [url, startMs, endMs, stopPreview, onError]);
  return { preview, stopPreview, previewing: Boolean(url && playingUrl === url) };
}
