import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { patternEnd, rangePattern, type Pattern, type Msg } from "@buzzzz/core";
import { playBuffer, prepareSound, soundNow, stopSound } from "./audio";
import { soundDuration } from "./soundGraph";
import type { IPlaybackRange } from "./model";
import { playbackStart } from "./playbackStart";
import { phonePlayback, type TPhonePreset } from "../connection/phoneLibrary";

interface IPlayback {
  send: (message: Msg) => void;
  phones: number;
  preset?: TPhonePreset;
  track?: { url: string; startMs: number; endMs: number } | null;
  durationMs?: number;
  cursor?: number;
  onCursorChange?: (time: number) => void;
  onError?: (message: string) => void;
  onStart?: (time: number) => void;
  onStop?: () => void;
  onSeek?: (time: number) => void;
}
export function usePlayback(props: IPlayback) {
  const { send, phones, track, onError, onStart, onStop, onSeek, durationMs = 0 } = props;
  const [scrub, setScrub] = useState<number | null>(null);
  const cursor = props.cursor ?? scrub;
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
  const run = useRef(0);
  const owner = useRef(() => {});
  const player = useRef<HTMLAudioElement | null>(null);
  const stopTrack = () => {
    const audio = player.current;
    player.current = null;
    audio?.pause();
  };
  const stopLocal = () => {
    run.current++;
    cancelAnimationFrame(raf.current);
    stopSound(owner);
    stopTrack();
  };
  const settle = () => {
    setPlaying(false);
    setPlayhead(null);
    onStop?.();
  };
  const stop = () => {
    stopLocal();
    send({ type: "stop" });
    settle();
  };
  // Natural completion: scheduled sound and the phone's pattern play out their own tails.
  const finish = () => {
    run.current++;
    cancelAnimationFrame(raf.current);
    stopTrack();
    settle();
  };
  const play = (
    pattern: Pattern,
    range?: IPlaybackRange,
    mode: "document" | "pattern" = "document",
    previewPreset?: TPhonePreset,
  ) => {
    stopLocal();
    const id = run.current;
    const preset = mode === "document" ? props.preset : previewPreset;
    setPlaying(true);
    const start = range?.start ?? 0;
    const fullEnd = Math.max(
      patternEnd(pattern),
      mode === "document" ? durationMs : 0,
      mode === "document" && track ? track.endMs - track.startMs : 0,
    );
    const end = range?.end ?? fullEnd;
    let from = mode === "document" ? playbackStart({ start, end }, cursor ?? 0) : start;
    let duration = Math.max(1, end - from);
    // Like Pulsar, a trimmed end excludes a tap exactly on it; the full length keeps it.
    const clip = (cursor: number) => {
      const clipped = rangePattern(pattern, cursor, end);
      if (end >= fullEnd) return clipped;
      const discretePattern = clipped.discretePattern.filter((tap) => tap.time < end - cursor);
      return { ...clipped, discretePattern };
    };
    const ranged = clip(from);
    let finishAt = Math.max(duration, soundDuration(ranged) * 1000);
    let soundFailed = false;
    let buffer: AudioBuffer | null = null;
    let loopBuffer: AudioBuffer | null = null;
    const usesTrack = (cursor: number) => {
      const prefs = preferences.current;
      return (
        mode === "document" &&
        !!prefs.track &&
        prefs.trackEnabled &&
        cursor < prefs.track.endMs - prefs.track.startMs
      );
    };
    // Auditions always sound like Pulsar's library Play; the editor follows the toggle.
    const wantsSound = () => mode === "pattern" || preferences.current.sound;
    const usesSound = (cursor: number) => wantsSound() && !soundFailed && !usesTrack(cursor);
    const keyOf = (prefs: typeof preferences.current) =>
      `${usesSound(from) && !!buffer}/${prefs.trackEnabled}/${prefs.onPhone}/${prefs.phones}/${prefs.track?.url}/${prefs.track?.startMs}/${prefs.track?.endMs}`;
    let outputKey = "";
    let delivery = 0;
    const startOutput = (elapsed: number) => {
      const currentDelivery = ++delivery;
      const prefs = preferences.current;
      const cursor = from + elapsed;
      stopSound(owner);
      stopTrack();
      const remaining = clip(cursor);
      if (usesTrack(cursor) && prefs.track) {
        const audio = new Audio(prefs.track.url);
        audio.currentTime = (prefs.track.startMs + cursor) / 1000;
        player.current = audio;
        void audio.play().catch(() => {
          if (id === run.current && player.current === audio) {
            stopTrack();
            onError?.("Audio playback could not start");
          }
        });
      }
      const soundStart = usesSound(cursor) && buffer ? playBuffer(buffer, elapsed, owner) : null;
      if (prefs.onPhone && prefs.phones)
        void phonePlayback(remaining, preset).then(
          (message) => {
            const current = preferences.current;
            if (
              id === run.current &&
              currentDelivery === delivery &&
              current.onPhone &&
              current.phones
            )
              send(message);
          },
          () => {
            if (id === run.current && currentDelivery === delivery)
              onError?.("Phone playback could not start");
          },
        );
      else send({ type: "stop" });
      outputKey = keyOf(prefs);
      return soundStart;
    };
    // Follows the audio clock when sound leads, so the playhead and loop track what's heard.
    let clock = () => 0;
    const output = (elapsed: number) => {
      const soundStart = startOutput(elapsed);
      const started = performance.now() - elapsed;
      clock =
        soundStart === null ? () => performance.now() - started : () => soundNow() - soundStart;
    };
    const restart = (looping = false) => {
      if (looping) {
        from = start;
        duration = Math.max(1, end - from);
        finishAt = Math.max(duration, soundDuration(clip(from)) * 1000);
        buffer = loopBuffer;
      }
      if (mode === "document") onStart?.(from);
      else onStop?.();
      output(0);
    };
    const tick = () => {
      const prefs = preferences.current;
      let elapsed = Math.max(0, clock());
      // Loops restart at the range end, clipping the tail as Pulsar does; a last pass rings out.
      if (prefs.loop && elapsed >= duration) {
        restart(true);
        elapsed = 0;
      } else if (elapsed >= finishAt) {
        const audio = player.current;
        if (end < fullEnd || !audio || audio.ended || audio.error) {
          finish();
          return;
        }
      }
      if (elapsed < duration && keyOf(prefs) !== outputKey) output(elapsed);
      const audio = player.current;
      if (
        audio &&
        (audio.ended ||
          (prefs.track &&
            audio.currentTime < audio.duration &&
            audio.currentTime * 1000 >= prefs.track.endMs))
      )
        stopTrack();
      const position =
        player.current && prefs.track
          ? player.current.currentTime * 1000 - prefs.track.startMs
          : from + elapsed;
      setPlayhead(Math.max(start, Math.min(end, position)));
      raf.current = requestAnimationFrame(tick);
    };
    const begin = () => {
      if (id !== run.current) return;
      restart();
      tick();
    };
    owner.current = () => {
      if (id === run.current) finish();
    };
    const firstSound = prepareSound(ranged);
    const sound = Promise.all([
      firstSound,
      from === start ? firstSound : prepareSound(clip(start)),
    ]).then(([first, repeated]) => {
      buffer = from === start ? repeated : first;
      loopBuffer = repeated;
    });
    if (!usesSound(from)) {
      sound.catch(() => (soundFailed = true));
      return begin();
    }
    sound.then(begin, () => {
      if (id !== run.current) return;
      soundFailed = true;
      onError?.("Sound could not start");
      const prefs = preferences.current;
      if ((prefs.onPhone && prefs.phones) || usesTrack(from)) begin();
      else finish();
    });
  };
  useEffect(
    () => () => {
      run.current++;
      cancelAnimationFrame(raf.current);
      stopSound(owner);
      stopTrack();
    },
    [],
  );
  return {
    playhead: playhead ?? cursor,
    setPlayhead: (time: number | null) => {
      if (playing) stop();
      setScrub(time);
      props.onCursorChange?.(time ?? 0);
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
