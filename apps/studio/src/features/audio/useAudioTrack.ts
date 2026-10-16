import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { decodeAudioFile } from "./decode";
import { useAudioGeneration } from "./generation/useAudioGeneration";
import { levelFrames } from "./metrics/framing";
import { useSignalAnalysis } from "./metrics/useSignalAnalysis";
import type { IAudioAnalysis, IAudioDecoded } from "./model";
import { frameRms } from "./signal/envelope";
import { monoMix, trimWindow } from "./signal/mix";
import { useAudioPreview } from "./useAudioPreview";

interface IAudioSource {
  file: File;
  url: string;
  durationMs: number;
  decoded: IAudioDecoded;
}
interface IAudioTrack {
  onError: (message: string) => void;
}

// Frame RMS of the trimmed clip for the timeline's waveform lane.
function waveform(samples: Float32Array, sampleRate: number, frameMs: number): IAudioAnalysis {
  const { frameSize, hop, stepMs } = levelFrames(sampleRate, frameMs);
  const rms = frameRms(samples, frameSize, hop);
  return {
    durationMs: (samples.length / sampleRate) * 1000,
    frames: Array.from(rms, (value, index) => ({ timeMs: index * stepMs, rms: value })),
  };
}

export function useAudioTrack(props: IAudioTrack) {
  const { onError } = props;
  const [source, setSource] = useState<IAudioSource | null>(null);
  const [decoding, setDecoding] = useState(false);
  const [trim, setTrimState] = useState({ startMs: 0, endMs: 0 });
  const requestId = useRef(0);
  const errorHandler = useRef(onError);
  useEffect(() => {
    errorHandler.current = onError;
  }, [onError]);
  useEffect(
    () => () => {
      requestId.current++;
    },
    [],
  );
  useEffect(
    () => () => {
      if (source) URL.revokeObjectURL(source.url);
    },
    [source],
  );
  const decoded = source?.decoded;
  const mono = useMemo(() => (decoded ? monoMix(decoded.channels) : null), [decoded]);
  const clip = useMemo(
    () => (mono && decoded ? trimWindow(mono, decoded.sampleRate, trim.startMs, trim.endMs) : null),
    [mono, decoded, trim.startMs, trim.endMs],
  );
  const metrics = useSignalAnalysis(clip, decoded?.sampleRate ?? 44100);
  const analysis = useMemo(
    () => (clip && decoded ? waveform(clip, decoded.sampleRate, metrics.frameMs) : null),
    [clip, decoded, metrics.frameMs],
  );
  const generation = useAudioGeneration(
    decoded ? { decoded, startMs: trim.startMs, endMs: trim.endMs } : null,
  );
  const working = decoding;
  const loadFile = useCallback(async (file: File, window?: { startMs: number; endMs: number }) => {
    const request = ++requestId.current;
    setDecoding(true);
    try {
      const decoded = await decodeAudioFile(file);
      if (request !== requestId.current) return false;
      const next = {
        file,
        url: URL.createObjectURL(file),
        durationMs: decoded.durationMs,
        decoded,
      };
      setSource(next);
      const startMs = Math.min(
        Math.max(0, decoded.durationMs - 1),
        Math.max(0, window?.startMs ?? 0),
      );
      setTrimState({
        startMs,
        endMs: Math.min(
          decoded.durationMs,
          startMs + 60000,
          Math.max(startMs + 1, window?.endMs ?? decoded.durationMs),
        ),
      });
      return true;
    } catch (error) {
      if (request === requestId.current)
        errorHandler.current(error instanceof Error ? error.message : "Audio decoding failed");
      return false;
    } finally {
      if (request === requestId.current) setDecoding(false);
    }
  }, []);
  const clear = useCallback(() => {
    requestId.current++;
    setSource(null);
    setDecoding(false);
    setTrimState({ startMs: 0, endMs: 0 });
  }, []);
  const setTrim = useCallback(
    (startMs: number, endMs: number) => {
      if (!source || !Number.isFinite(startMs) || !Number.isFinite(endMs)) return;
      const start = Math.min(Math.max(0, source.durationMs - 1), Math.max(0, startMs));
      const end = Math.min(source.durationMs, start + 60000, Math.max(start + 1, endMs));
      setTrimState({ startMs: start, endMs: end });
    },
    [source],
  );
  const playback = useAudioPreview(source?.url, trim.startMs, trim.endMs, onError);
  return {
    source,
    analysis,
    metrics,
    generation,
    working,
    decoding,
    trim,
    setTrim,
    loadFile,
    clear,
    ...playback,
  };
}
