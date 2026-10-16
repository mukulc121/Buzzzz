import { useEffect, useRef, useState } from "react";
import type { Pattern } from "@buzzzz/core";
import { trimChannels } from "../audio/signal/mix";
import { analyzeVoiceAsync } from "../audio/voice/client";
import { monitorVoice } from "./voiceMeter";
import { voicePattern } from "./voicePattern";

export function useVoiceSketch(onError: (message: string) => void) {
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alive = useRef(true);
  const request = useRef(0);
  const metering = useRef<(() => void) | null>(null);
  const [state, setState] = useState<"idle" | "recording" | "processing">("idle");
  const [pattern, setPattern] = useState<Pattern | null>(null);
  const [level, setLevel] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const release = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    metering.current?.();
    metering.current = null;
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
  };
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      request.current += 1;
      if (recorder.current?.state === "recording") recorder.current.stop();
      release();
    };
  }, []);
  const stop = () => {
    if (recorder.current?.state === "recording") recorder.current.stop();
    release();
  };
  const cancel = () => {
    request.current += 1;
    stop();
    setState("idle");
    setPattern(null);
  };
  const start = async () => {
    const current = ++request.current;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      onError("Microphone recording requires a supported browser on HTTPS or localhost");
      return;
    }
    setState("processing");
    setPattern(null);
    setLevel(0);
    setElapsedMs(0);
    try {
      const input = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!alive.current || current !== request.current) {
        input.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.current = input;
      metering.current = monitorVoice(input, (nextLevel, elapsed) => {
        if (alive.current && current === request.current) {
          setLevel(nextLevel);
          setElapsedMs(elapsed);
        }
      });
      const capture = new MediaRecorder(input);
      recorder.current = capture;
      const chunks: Blob[] = [];
      capture.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      capture.onerror = () => {
        if (current !== request.current) return;
        request.current += 1;
        release();
        if (alive.current) {
          setState("idle");
          onError("Microphone recording failed");
        }
      };
      capture.onstop = () => {
        if (current !== request.current) return;
        release();
        if (!alive.current || current !== request.current) return;
        setState("processing");
        const decode = async () => {
          const context = new AudioContext({ sampleRate: 44100 });
          try {
            const blob = new Blob(chunks, { type: capture.mimeType });
            if (blob.size > 4 * 1024 * 1024) throw new Error("Recording exceeds 4 MiB");
            const audio = await context.decodeAudioData(await blob.arrayBuffer());
            if (!alive.current || current !== request.current) return;
            const channels = Array.from({ length: audio.numberOfChannels }, (_, index) =>
              audio.getChannelData(index),
            );
            const result = await analyzeVoiceAsync(
              trimChannels(channels, audio.sampleRate, 0, 15000),
              audio.sampleRate,
            );
            const nextPattern = voicePattern(result);
            if (alive.current && current === request.current) setPattern(nextPattern);
          } finally {
            await context.close();
          }
        };
        void decode()
          .catch((error: unknown) => {
            if (alive.current && current === request.current)
              onError(error instanceof Error ? error.message : "Voice analysis failed");
          })
          .finally(() => {
            if (alive.current && current === request.current) setState("idle");
          });
      };
      capture.start();
      setState("recording");
      timer.current = setTimeout(stop, 15000);
    } catch (error) {
      if (current !== request.current) return;
      release();
      if (alive.current && current === request.current) {
        setState("idle");
        onError(error instanceof Error ? error.message : "Microphone access failed");
      }
    }
  };
  return { state, pattern, level, elapsedMs, start, stop, cancel };
}
