import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { analyzeAudioAsync } from "./analysis";
import { decodeAudioFile } from "./decode";
import { generateAudioCandidates } from "./generation";
import type { AudioMetric, IAudioAnalysis, IAudioDecoded, IAudioGenerationOptions } from "./model";
import { useAudioPreview } from "./useAudioPreview";
import { DEFAULT_GENERATION_OPTIONS } from "./tuning";

interface IAudioSource {
  file: File;
  url: string;
  durationMs: number;
  decoded: IAudioDecoded;
}
interface IAudioTrack {
  onError: (message: string) => void;
}
interface IAnalysisResult {
  source: IAudioSource;
  key: string;
  analysis: IAudioAnalysis | null;
}

export function useAudioTrack(props: IAudioTrack) {
  const { onError } = props;
  const [source, setSource] = useState<IAudioSource | null>(null);
  const [result, setResult] = useState<IAnalysisResult | null>(null);
  const [decoding, setDecoding] = useState(false);
  const [frameMs, setFrameMs] = useState(20);
  const [trim, setTrimState] = useState({ startMs: 0, endMs: 0 });
  const [selectedMetrics, setSelectedMetrics] = useState<AudioMetric[]>([
    "vibrotactileLoudness",
    "envelopeFollower",
  ]);
  const [displayMode, setDisplayMode] = useState<"fit" | "true">("fit");
  const [decibels, setDecibels] = useState(false);
  const [generationOptions, setGenerationOptions] = useState<Required<IAudioGenerationOptions>>(
    DEFAULT_GENERATION_OPTIONS,
  );
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
  const key = `${trim.startMs}/${trim.endMs}/${frameMs}`;
  const matches = result?.source === source && result?.key === key;
  const analysis = matches ? result.analysis : null;
  const working = decoding || Boolean(source && !matches);
  useEffect(() => {
    if (!source) return;
    const controller = new AbortController();
    analyzeAudioAsync(
      source.decoded,
      { offsetMs: trim.startMs, durationMs: trim.endMs - trim.startMs, frameMs },
      controller.signal,
    )
      .then((value) => {
        if (!controller.signal.aborted) setResult({ source, key, analysis: value });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setResult({ source, key, analysis: null });
        errorHandler.current(error instanceof Error ? error.message : "Audio analysis failed");
      });
    return () => controller.abort();
  }, [source, trim.startMs, trim.endMs, frameMs, key]);
  const candidates = useMemo(
    () => (analysis ? generateAudioCandidates(analysis, generationOptions) : []),
    [analysis, generationOptions],
  );
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
      setResult(null);
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
    setResult(null);
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
    candidates,
    working,
    decoding,
    frameMs,
    setFrameMs,
    trim,
    setTrim,
    selectedMetrics,
    setSelectedMetrics,
    displayMode,
    setDisplayMode,
    decibels,
    setDecibels,
    generationOptions,
    setGenerationOptions,
    loadFile,
    clear,
    ...playback,
  };
}
