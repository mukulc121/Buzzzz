import { sha256 } from "../../crypto";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { analyzeAnimationAsync } from "./analysisAsync";
import { generateAnimationCandidates } from "./generation";
import { readAnimationFile } from "./import";
import { DEFAULT_ANIMATION_OPTIONS } from "./generationOptions";
import { useAnimationSelection } from "./useAnimationSelection";
import type { Pattern } from "@buzzzz/core";
import type { IAnimationAnalysis, IAnimationDocument, IAnimationGenerationOptions } from "./model";

interface IAnimationSource {
  scopeKey: string;
  identity: string;
  file: File;
  url: string;
  durationMs: number;
  data: Record<string, unknown>;
  document: IAnimationDocument;
  animationId: string;
  animations: { id: string; document: IAnimationDocument }[];
  assetUrls: string[];
}
interface IAnimationTrack {
  onError: (message: string) => void;
  scopeKey: string;
  currentPattern: Pattern;
  onGenerated: (pattern: Pattern) => void;
}

export function useAnimationTrack(props: IAnimationTrack) {
  const { onError } = props;
  const scope = useRef(props.scopeKey);
  useLayoutEffect(() => {
    scope.current = props.scopeKey;
  }, [props.scopeKey]);
  const [source, setSource] = useState<IAnimationSource | null>(null);
  const [loading, setLoading] = useState(false);
  const [analysisRevision, setAnalysisRevision] = useState(0);
  const [result, setResult] = useState<{
    source: IAnimationSource;
    frameMs: number;
    smoothingMs: number;
    analysis: IAnimationAnalysis | null;
    revision: number;
    error?: string;
  } | null>(null);
  const [frameMs, setFrameMs] = useState(1000 / 240);
  const [generationOptions, setGenerationOptions] = useState(DEFAULT_ANIMATION_OPTIONS);
  const [hybrid, setHybrid] = useState({
    gain: 1.2,
    threshold: 0.17,
    minGapMs: 70,
    freqFollow: 0.7,
  });
  const [strategyParams, setStrategyParams] = useState<
    NonNullable<IAnimationGenerationOptions["strategyParams"]>
  >({});
  const smoothingMs = generationOptions.smoothingMs;
  const setSmoothingMs = useCallback((value: number) => {
    if (Number.isFinite(value))
      setGenerationOptions((current) => ({
        ...current,
        smoothingMs: Math.max(0, Math.min(40, value)),
      }));
  }, []);
  const [speed, setSpeed] = useState(1);
  const [seekMs, setSeekState] = useState(0);
  const [seekRevision, setSeekRevision] = useState(0);
  const [positionMs, setPositionMs] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [previewMode, setPreviewMode] = useState<
    "stacked" | "side-by-side" | "floating" | "fullscreen"
  >("side-by-side");
  const [previewVisible, setPreviewVisible] = useState(true);
  const requestId = useRef(0);
  const errorHandler = useRef(onError);
  const url = source?.url;
  const assetUrls = source?.assetUrls;
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
      if (url) URL.revokeObjectURL(url);
      for (const asset of assetUrls ?? []) URL.revokeObjectURL(asset);
    },
    [url, assetUrls],
  );
  const matches =
    result?.source === source &&
    result?.frameMs === frameMs &&
    result?.smoothingMs === smoothingMs &&
    result?.revision === analysisRevision;
  const analysis = matches ? result.analysis : null;
  const analysisError = matches ? (result.error ?? null) : null;
  const retryAnalysis = useCallback(() => setAnalysisRevision((revision) => revision + 1), []);
  const working = loading || Boolean(source && !matches);
  useEffect(() => {
    if (!source) return;
    const controller = new AbortController();
    analyzeAnimationAsync(source.document, frameMs, controller.signal, smoothingMs)
      .then((value) => {
        if (!controller.signal.aborted)
          setResult({ source, frameMs, smoothingMs, analysis: value, revision: analysisRevision });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const message = error instanceof Error ? error.message : "Animation analysis failed";
        setResult({
          source,
          frameMs,
          smoothingMs,
          analysis: null,
          revision: analysisRevision,
          error: message,
        });
      });
    return () => controller.abort();
  }, [source, frameMs, smoothingMs, analysisRevision]);
  const candidateAnalysis =
    result?.source === source && source?.scopeKey === props.scopeKey ? result.analysis : null;
  const candidates = useMemo(
    () =>
      candidateAnalysis
        ? generateAnimationCandidates(candidateAnalysis, {
            ...generationOptions,
            strategyParams: { ...strategyParams, hybrid },
          })
        : [],
    [candidateAnalysis, generationOptions, hybrid, strategyParams],
  );
  const selection = useAnimationSelection({
    sourceKey:
      source?.scopeKey === props.scopeKey
        ? `${props.scopeKey}/${source.animationId}/${source.identity}`
        : null,
    candidates,
    currentPattern: props.currentPattern,
    onGenerated: props.onGenerated,
  });
  const loadFile = useCallback(async (file: File) => {
    const request = ++requestId.current;
    const scopeKey = scope.current;
    setLoading(true);
    setPlaying(false);
    let assetUrls: string[] = [];
    try {
      const bundle = await readAnimationFile(file);
      assetUrls = bundle.assetUrls;
      const identity = await sha256(await file.arrayBuffer());
      if (request !== requestId.current) {
        for (const asset of bundle.assetUrls) URL.revokeObjectURL(asset);
        return false;
      }
      const selected =
        bundle.animations.find((item) => item.id === bundle.initialId) ?? bundle.animations[0];
      setSource({
        scopeKey,
        identity,
        file,
        url: URL.createObjectURL(file),
        data: selected.document.data,
        document: selected.document,
        durationMs: selected.document.durationMs,
        animationId: selected.id,
        animations: bundle.animations,
        assetUrls: bundle.assetUrls,
      });
      setPreviewVisible(true);
      setResult(null);
      setSeekState(0);
      setPositionMs(0);
      return true;
    } catch (error) {
      for (const url of assetUrls) URL.revokeObjectURL(url);
      if (request === requestId.current)
        errorHandler.current(error instanceof Error ? error.message : "Animation import failed");
      return false;
    } finally {
      if (request === requestId.current) setLoading(false);
    }
  }, []);
  const selectAnimation = useCallback(
    (id: string) => {
      const selected = source?.animations.find((item) => item.id === id);
      if (!source || !selected) return;
      setPlaying(false);
      setSeekState(0);
      setPositionMs(0);
      setSource({
        ...source,
        data: selected.document.data,
        document: selected.document,
        durationMs: selected.document.durationMs,
        animationId: id,
      });
    },
    [source],
  );
  const clear = useCallback(() => {
    requestId.current++;
    setSource(null);
    setResult(null);
    setLoading(false);
    setPlaying(false);
    setSeekState(0);
    setPositionMs(0);
  }, []);
  const setSeekMs = useCallback(
    (time: number) => {
      if (Number.isFinite(time)) {
        const value = Math.max(0, Math.min(source?.durationMs ?? 0, time));
        setSeekState(value);
        setSeekRevision((revision) => revision + 1);
        setPositionMs(value);
      }
    },
    [source],
  );
  return {
    source,
    analysis,
    analysisError,
    retryAnalysis,
    candidates,
    selection,
    working,
    loading,
    frameMs,
    setFrameMs,
    smoothingMs,
    setSmoothingMs,
    generationOptions,
    setGenerationOptions,
    hybrid,
    setHybrid,
    strategyParams,
    setStrategyParams,
    speed,
    setSpeed,
    seekMs,
    setSeekMs,
    seekRevision,
    positionMs,
    setPositionMs,
    playing,
    setPlaying,
    previewMode,
    setPreviewMode,
    previewVisible,
    setPreviewVisible,
    loadFile,
    selectAnimation,
    clear,
    onError,
  };
}
