import { useMemo, useState } from "react";
import { readStored, writeStored } from "../storedSettings";
import type { ValueAxis } from "./display";
import { AUDIO_METRICS, clampFrameMs, DEFAULT_FRAME_MS, metricDefaults } from "./index";
import type { IMetricSeries } from "./model";

const FRAME_KEY = "buzzzz.audio-analysis.frame-ms";
const METRICS_KEY = "buzzzz.audio-analysis.metrics";
const PARAMS_KEY = "buzzzz.audio-analysis.params";
const AXIS_KEY = "buzzzz.audio-analysis.value-axis";
const DB_KEY = "buzzzz.audio-analysis.db-curve";

type MetricParams = Record<string, Record<string, number>>;

function storedFrameMs() {
  return readStored(
    FRAME_KEY,
    (raw) => {
      const value = raw === null ? NaN : Number(raw);
      return Number.isFinite(value) ? clampFrameMs(value) : DEFAULT_FRAME_MS;
    },
    DEFAULT_FRAME_MS,
  );
}

function storedEnabled() {
  const enabled = Object.fromEntries(AUDIO_METRICS.map((metric) => [metric.id, false]));
  return readStored(
    METRICS_KEY,
    (raw) => {
      if (raw) for (const id of raw.split(",")) if (id in enabled) enabled[id] = true;
      return enabled;
    },
    enabled,
  );
}

function storedParams() {
  const params: MetricParams = Object.fromEntries(
    AUDIO_METRICS.map((metric) => [metric.id, metricDefaults(metric)]),
  );
  return readStored(
    PARAMS_KEY,
    (raw) => {
      if (!raw) return params;
      const saved = JSON.parse(raw) as MetricParams;
      for (const metric of AUDIO_METRICS)
        for (const param of metric.params ?? []) {
          const value = saved[metric.id]?.[param.id];
          if (typeof value === "number" && Number.isFinite(value))
            params[metric.id][param.id] = value;
        }
      return params;
    },
    params,
  );
}

// Pulsar's signal-analysis store: enabled metrics measured over the trimmed mono clip.
export function useSignalAnalysis(samples: Float32Array | null, sampleRate: number) {
  const [frameMs, setFrame] = useState(storedFrameMs);
  const [enabled, setEnabled] = useState(storedEnabled);
  const [params, setParams] = useState(storedParams);
  const [valueAxis, setAxis] = useState<ValueAxis>(() =>
    readStored(AXIS_KEY, (raw) => (raw === "full" ? "full" : "clip"), "clip"),
  );
  const [dbCurve, setDb] = useState(() => readStored(DB_KEY, (raw) => raw === "1", false));
  const series = useMemo(() => {
    const result: Record<string, IMetricSeries> = {};
    if (!samples) return result;
    for (const metric of AUDIO_METRICS)
      if (enabled[metric.id])
        result[metric.id] = metric.compute(samples, sampleRate, frameMs, params[metric.id] ?? {});
    return result;
  }, [samples, sampleRate, frameMs, enabled, params]);
  return {
    frameMs,
    enabled,
    params,
    valueAxis,
    dbCurve,
    series,
    setFrameMs: (value: number) => {
      const next = clampFrameMs(value);
      writeStored(FRAME_KEY, String(next));
      setFrame(next);
    },
    setMetricEnabled: (id: string, on: boolean) => {
      if (!(id in enabled)) return;
      const next = { ...enabled, [id]: on };
      writeStored(
        METRICS_KEY,
        Object.keys(next)
          .filter((key) => next[key])
          .join(","),
      );
      setEnabled(next);
    },
    setMetricParam: (id: string, param: string, value: number) => {
      const current = params[id];
      if (!current || !(param in current) || current[param] === value) return;
      const next = { ...params, [id]: { ...current, [param]: value } };
      writeStored(PARAMS_KEY, JSON.stringify(next));
      setParams(next);
    },
    setValueAxis: (axis: ValueAxis) => {
      writeStored(AXIS_KEY, axis);
      setAxis(axis);
    },
    setDbCurve: (on: boolean) => {
      writeStored(DB_KEY, on ? "1" : "0");
      setDb(on);
    },
  };
}
