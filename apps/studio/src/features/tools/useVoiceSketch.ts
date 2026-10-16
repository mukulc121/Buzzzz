import { useEffect, useRef, useState } from "react";
import { analyzeVoiceAsync } from "../audio/voice/client";
import type { IVoiceSignal } from "../audio/voice/analysis";
import { startVoiceCapture, voiceError } from "./voiceCapture";

type VoiceState =
  | { kind: "idle" | "requesting" | "recording" | "analyzing" }
  | { kind: "ready"; signal: IVoiceSignal }
  | { kind: "error"; message: string };

export function useVoiceSketch() {
  const capture = useRef<Awaited<ReturnType<typeof startVoiceCapture>> | null>(null);
  const request = useRef(0);
  const [state, setState] = useState<VoiceState>({ kind: "idle" });
  const [level, setLevel] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const stop = async () => {
    const current = capture.current;
    if (!current) return;
    capture.current = null;
    const generation = request.current;
    setState({ kind: "analyzing" });
    try {
      const recording = await current.stop();
      if (generation !== request.current) return;
      const signal = await analyzeVoiceAsync(recording.channels, recording.sampleRate);
      if (generation === request.current) setState({ kind: "ready", signal });
    } catch (error) {
      if (generation === request.current) setState({ kind: "error", message: voiceError(error) });
    }
  };
  useEffect(() => {
    if (state.kind !== "recording") return;
    const interval = setInterval(() => {
      const current = capture.current;
      if (!current) return;
      setLevel(current.level());
      setElapsedMs(current.elapsedMs());
      if (current.elapsedMs() >= 15000) void stop();
    }, 50);
    return () => clearInterval(interval);
  }, [state.kind]);
  useEffect(
    () => () => {
      request.current += 1;
      capture.current?.cancel();
      capture.current = null;
    },
    [],
  );
  const start = async () => {
    const generation = ++request.current;
    setLevel(0);
    setElapsedMs(0);
    setState({ kind: "requesting" });
    try {
      const next = await startVoiceCapture();
      if (generation !== request.current) return next.cancel();
      capture.current = next;
      setState({ kind: "recording" });
    } catch (error) {
      if (generation === request.current) setState({ kind: "error", message: voiceError(error) });
    }
  };
  const cancel = () => {
    request.current += 1;
    capture.current?.cancel();
    capture.current = null;
    setState({ kind: "idle" });
    setLevel(0);
    setElapsedMs(0);
  };
  return { state, level, elapsedMs, start, stop, cancel };
}
