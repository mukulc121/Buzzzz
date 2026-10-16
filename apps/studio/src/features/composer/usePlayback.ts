import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { patternEnd, rangePattern, toDevice, type Pattern, type Msg } from "@buzzzz/core";
import { playSound, stopSound } from "./audio";
import type { IPlaybackRange } from "./model";

interface IPlayback {
  send: (message: Msg) => void;
  phones: number;
  track?: { url: string; startMs: number; endMs: number } | null;
  durationMs?: number;
  onError?: (message: string) => void;
  onStart?: (time: number) => void;
  onStop?: () => void;
  onSeek?: (time: number) => void;
}
export function usePlayback(props: IPlayback) {
  const { send, phones, track, onError, onStart, onStop, onSeek, durationMs = 0 } = props;
  const [playhead, setPlayhead] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [sound, setSound] = useState(true);
  const [onPhone, setOnPhone] = useState(true);
  const [trackEnabled, setTrackEnabled] = useState(true);
  const [loop, setLoop] = useState(false);
  const preferences = useRef({ sound, onPhone, trackEnabled, loop, phones, track });
  useLayoutEffect(() => {
    preferences.current = { sound, onPhone, trackEnabled, loop, phones, track };
  }, [sound, onPhone, trackEnabled, loop, phones, track]);
  const raf = useRef(0);
  const player = useRef<HTMLAudioElement | null>(null);
  const stopLocal = () => {
    cancelAnimationFrame(raf.current);
    stopSound();
    player.current?.pause();
  };
  const stop = () => {
    stopLocal();
    send({ type: "stop" });
    setPlaying(false);
    setPlayhead(null);
    onStop?.();
  };
  const play = (
    pattern: Pattern,
    range?: IPlaybackRange,
    mode: "document" | "pattern" = "document",
  ) => {
    stopLocal();
    setPlaying(true);
    const start = range?.start ?? 0;
    if (mode === "document") onStart?.(start);
    else onStop?.();
    const end =
      range?.end ??
      Math.max(
        patternEnd(pattern),
        mode === "document" ? durationMs : 0,
        mode === "document" && track ? track.endMs - track.startMs : 0,
      );
    const duration = Math.max(1, end - start);
    let outputKey = "";
    const startOutput = (elapsed: number) => {
      const prefs = preferences.current;
      const cursor = start + elapsed;
      stopSound();
      player.current?.pause();
      const remaining = rangePattern(pattern, cursor, end);
      if (
        mode === "document" &&
        prefs.track &&
        prefs.trackEnabled &&
        cursor < prefs.track.endMs - prefs.track.startMs
      ) {
        const audio = new Audio(prefs.track.url);
        audio.currentTime = (prefs.track.startMs + cursor) / 1000;
        player.current = audio;
        void audio.play().catch(() => onError?.("Audio playback could not start"));
      } else if (prefs.sound) playSound(remaining);
      if (prefs.onPhone && prefs.phones) send({ type: "play", pattern: toDevice(remaining) });
      else send({ type: "stop" });
      outputKey = `${prefs.sound}/${prefs.trackEnabled}/${prefs.onPhone}/${prefs.phones}/${prefs.track?.url}/${prefs.track?.startMs}/${prefs.track?.endMs}`;
    };
    startOutput(0);
    let started = performance.now();
    const tick = () => {
      const prefs = preferences.current;
      let elapsed = performance.now() - started;
      if (elapsed >= duration) {
        if (!prefs.loop) {
          stop();
          return;
        }
        started = performance.now();
        elapsed = 0;
        if (mode === "document") onStart?.(start);
        startOutput(0);
      }
      const currentKey = `${prefs.sound}/${prefs.trackEnabled}/${prefs.onPhone}/${prefs.phones}/${prefs.track?.url}/${prefs.track?.startMs}/${prefs.track?.endMs}`;
      if (currentKey !== outputKey) startOutput(elapsed);
      if (prefs.track && start + elapsed >= prefs.track.endMs - prefs.track.startMs)
        player.current?.pause();
      setPlayhead(start + Math.min(duration, elapsed));
      raf.current = requestAnimationFrame(tick);
    };
    tick();
  };
  useEffect(
    () => () => {
      cancelAnimationFrame(raf.current);
      stopSound();
      player.current?.pause();
    },
    [],
  );
  return {
    playhead,
    setPlayhead: (time: number | null) => {
      if (playing) stop();
      setPlayhead(time);
      onSeek?.(time ?? 0);
    },
    playing,
    play,
    stop,
    sound,
    setSound,
    onPhone,
    setOnPhone,
    trackEnabled,
    setTrackEnabled,
    loop,
    setLoop,
  };
}
