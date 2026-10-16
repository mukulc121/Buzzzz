import { useCallback, useEffect, useRef, useState } from "react";
import { useSharedValue } from "react-native-reanimated";
import { usePatternComposer } from "react-native-pulsar";
import { runOnUISync } from "react-native-worklets";
import { MAX_RECORDING_DURATION_MS, recordedPattern, type IPlaygroundEvent } from "./recording";

export function usePlaygroundRecorder() {
  const composer = usePatternComposer();
  const { stop, parse, play } = composer;
  const [recording, setRecording] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const captured = useRef<readonly IPlaygroundEvent[]>([]);
  const parsed = useRef(false);
  const started = useRef(0);
  const recordTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const playTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const events = useSharedValue<IPlaygroundEvent[]>([]);
  const recordingOn = useSharedValue(false);
  const recordingStart = useSharedValue(0);
  const stopPlaying = useCallback(() => {
    clearTimeout(playTimer.current);
    setPlaying(false);
    stop();
  }, [stop]);
  const stopRecording = useCallback(() => {
    clearTimeout(recordTimer.current);
    if (!started.current) return;
    captured.current = runOnUISync(() => {
      recordingOn.set(false);
      return events.get();
    });
    setDuration(Math.min(MAX_RECORDING_DURATION_MS, Date.now() - started.current));
    started.current = 0;
    setRecording(false);
    parsed.current = false;
  }, [events, recordingOn]);
  const startRecording = () => {
    stopPlaying();
    clearTimeout(recordTimer.current);
    captured.current = [];
    parsed.current = false;
    started.current = Date.now();
    setDuration(0);
    runOnUISync(() => {
      events.set([]);
      recordingStart.set(Date.now());
      recordingOn.set(true);
    });
    setRecording(true);
    recordTimer.current = setTimeout(stopRecording, MAX_RECORDING_DURATION_MS);
  };
  const recordEvent = useCallback(
    (type: IPlaygroundEvent["type"], x: number, y: number) => {
      "worklet";
      if (!recordingOn.get()) return;
      const time = Date.now() - recordingStart.get();
      events.modify((previous) => {
        previous.push({ type, time, x, y });
        return previous;
      });
    },
    [events, recordingOn, recordingStart],
  );
  const playRecordedPattern = () => {
    if (!parsed.current) {
      parse(recordedPattern(captured.current));
      parsed.current = true;
    }
    play();
    setPlaying(true);
    clearTimeout(playTimer.current);
    playTimer.current = setTimeout(() => setPlaying(false), duration + 100);
  };
  useEffect(
    () => () => {
      clearTimeout(recordTimer.current);
      clearTimeout(playTimer.current);
      recordingOn.set(false);
      stop();
    },
    [recordingOn, stop],
  );
  return {
    recording,
    playing,
    duration,
    recordEvent,
    startRecording,
    stopRecording,
    stopPlaying,
    playRecordedPattern,
    getEvents: () => captured.current,
  };
}
