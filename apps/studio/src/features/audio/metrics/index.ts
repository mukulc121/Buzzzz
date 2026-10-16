import { CHARACTER_METRICS } from "./character";
import { DISCRETE_METRICS } from "./discrete";
import { FREQUENCY_METRICS } from "./frequency";
import { INTENSITY_METRICS } from "./intensity";
import type { IMetric } from "./model";

const GROUPS: [string, IMetric[]][] = [
  ["Intensity", INTENSITY_METRICS],
  ["Frequency", FREQUENCY_METRICS],
  ["Discrete and tempo", DISCRETE_METRICS],
  ["Source character", CHARACTER_METRICS],
];

export const AUDIO_METRICS = GROUPS.flatMap(([group, metrics]) =>
  metrics.map((metric) => ({ ...metric, group })),
);

export const metricById = (id: string) => AUDIO_METRICS.find((metric) => metric.id === id);

export function metricDefaults(metric: IMetric) {
  const values: Record<string, number> = {};
  for (const param of metric.params ?? []) values[param.id] = param.defaultValue;
  return values;
}

export const MIN_FRAME_MS = 2;
export const MAX_FRAME_MS = 100;
export const DEFAULT_FRAME_MS = 20;
export const clampFrameMs = (value: number) =>
  Math.min(MAX_FRAME_MS, Math.max(MIN_FRAME_MS, Math.round(value)));
