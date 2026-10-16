import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Pattern } from "@buzzzz/core";
import { isEdited } from "../selection";
import { trimChannels } from "../signal/mix";
import type { IAudioDecoded } from "../model";
import { readStored, writeStored } from "../storedSettings";
import { generate } from "./client";
import type { IGenerationOptions, IStrategyResult, StrategyParams } from "./model";
import { DEFAULT_GENERATION } from "./options";
import { toPattern } from "./pattern";

const OPTIONS_KEY = "buzzzz.audio-generation.options";
const PARAMS_KEY = "buzzzz.audio-generation.params";
const SOURCE_DELAY_MS = 300;
const SETTINGS_DELAY_MS = 450;

export interface IGeneratedApproach extends Omit<IStrategyResult, "pattern"> {
  pattern: Pattern;
  pointCount: number;
  eventCount: number;
}
interface IGenerationRun {
  status: "running" | "done" | "error";
  results: IGeneratedApproach[];
  error?: string;
}
interface ISelection {
  selectedId: string | null;
  applied: Pattern | null;
}
// The open pattern, read and written by the Sound panel.
interface IPatternBinding {
  read: () => Pattern;
  apply: (pattern: Pattern, label: string) => void;
}
interface IGenerationSource {
  decoded: IAudioDecoded;
  startMs: number;
  endMs: number;
}

const parseJson = <T>(raw: string | null, fallback: T): T => (raw ? JSON.parse(raw) : fallback);

function approach(result: IStrategyResult): IGeneratedApproach {
  const { intensity, frequency, discrete } = result.pattern;
  return {
    ...result,
    pattern: toPattern(result.pattern),
    pointCount: intensity.length + frequency.length,
    eventCount: discrete.length,
  };
}

// Pulsar's generation store: runs every approach on the trimmed track and re-runs on change.
export function useAudioGeneration(source: IGenerationSource | null) {
  const [options, setOptions] = useState<IGenerationOptions>(() =>
    readStored(OPTIONS_KEY, (raw) => ({ ...DEFAULT_GENERATION, ...parseJson(raw, {}) }), {
      ...DEFAULT_GENERATION,
    }),
  );
  const [strategyParams, setStrategyParams] = useState<StrategyParams>(() =>
    readStored(PARAMS_KEY, (raw) => parseJson(raw, {}), {}),
  );
  const [run, setRun] = useState<IGenerationRun | null>(null);
  const [selection, setSelection] = useState<ISelection>({ selectedId: null, applied: null });
  const binding = useRef<IPatternBinding | null>(null);
  const chosen = useRef(selection);
  const request = useRef(0);
  const generated = useRef(false);
  const settings = useRef({ options, strategyParams });
  const latest = useRef(source);
  useEffect(() => {
    settings.current = { options, strategyParams };
    latest.current = source;
    chosen.current = selection;
  });
  const sourceKey = source ? `${Math.round(source.startMs)}-${Math.round(source.endMs)}` : null;
  // A regenerated selection replaces the pattern only while the user has not edited it.
  const reapply = (approaches: IGeneratedApproach[]) => {
    const { selectedId, applied } = chosen.current;
    const next = approaches.find((item) => item.strategyId === selectedId && !item.error);
    const target = binding.current;
    if (!next || !target || isEdited(target.read(), applied)) return;
    target.apply(next.pattern, next.name);
    setSelection({ selectedId, applied: next.pattern });
  };
  const start = useCallback((target: IGenerationSource) => {
    const current = ++request.current;
    generated.current = true;
    setRun((previous) => ({ status: "running", results: previous?.results ?? [] }));
    const { decoded, startMs, endMs } = target;
    generate(
      trimChannels(decoded.channels, decoded.sampleRate, startMs, endMs),
      decoded.sampleRate,
      settings.current.options,
      settings.current.strategyParams,
    )
      .then(({ results }) => {
        if (current !== request.current) return;
        const approaches = results.map(approach);
        setRun({ status: "done", results: approaches });
        reapply(approaches);
      })
      .catch((error: unknown) => {
        if (current === request.current)
          setRun((previous) => ({
            status: "error",
            results: previous?.results ?? [],
            error: error instanceof Error ? error.message : "Generation failed.",
          }));
      });
  }, []);
  const decoded = source?.decoded;
  useEffect(() => {
    if (!decoded || !sourceKey) {
      request.current++;
      generated.current = false;
      return;
    }
    const timer = setTimeout(() => latest.current && start(latest.current), SOURCE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [decoded, sourceKey, start]);
  const settingsKey = JSON.stringify({ options, strategyParams });
  const seen = useRef(settingsKey);
  useEffect(() => {
    if (seen.current === settingsKey) return;
    seen.current = settingsKey;
    const timer = setTimeout(() => {
      if (latest.current && generated.current) start(latest.current);
    }, SETTINGS_DELAY_MS);
    return () => clearTimeout(timer);
  }, [settingsKey, start]);
  useEffect(
    () => () => {
      request.current++;
    },
    [],
  );
  return useMemo(
    () => ({
      run: sourceKey ? run : null,
      options,
      strategyParams,
      setOption: (key: keyof IGenerationOptions, value: number) =>
        setOptions((current) => {
          const next = { ...current, [key]: value };
          writeStored(OPTIONS_KEY, JSON.stringify(next));
          return next;
        }),
      setStrategyParam: (strategyId: string, param: string, value: number) =>
        setStrategyParams((current) => {
          const next = { ...current, [strategyId]: { ...current[strategyId], [param]: value } };
          writeStored(PARAMS_KEY, JSON.stringify(next));
          return next;
        }),
      resetOptions: () => {
        writeStored(OPTIONS_KEY, JSON.stringify(DEFAULT_GENERATION));
        writeStored(PARAMS_KEY, "{}");
        setOptions({ ...DEFAULT_GENERATION });
        setStrategyParams({});
      },
      retry: () => latest.current && start(latest.current),
      selectedId: selection.selectedId,
      applied: selection.applied,
      select: (selectedId: string | null, applied: Pattern | null) =>
        setSelection({ selectedId, applied }),
      bind: (target: IPatternBinding | null) => {
        binding.current = target;
      },
    }),
    [run, sourceKey, options, strategyParams, start, selection],
  );
}
