import type { IMetric, IMetricSeries } from "./model";

export type ValueAxis = "clip" | "full";

const DB_RANGE = 60;
const unit = (value: number) => Math.min(1, Math.max(0, value));

// Normalized 0-1 points: fit to the clip peak, or against the metric's own full scale.
export function metricPoints(
  series: IMetricSeries,
  scale: IMetric["scale"],
  axis: ValueAxis,
  dbCurve: boolean,
) {
  if (series.values.length === 0 || series.stepMs <= 0) return [];
  let reference = axis === "full" ? (scale.full ?? null) : null;
  if (reference === null) {
    reference = 0;
    for (const value of series.values) if (value > reference) reference = value;
  }
  if (reference <= 0) return [];
  const peak = reference;
  return Array.from(series.values, (raw, index) => {
    const value = raw / peak;
    const shaped =
      !dbCurve || !scale.level
        ? unit(value)
        : value <= 0
          ? 0
          : unit(1 + (20 * Math.log10(Math.min(1, value))) / DB_RANGE);
    return { time: index * series.stepMs, value: shaped, rawValue: raw };
  });
}

export function scaleCaption(metric: IMetric) {
  const { full, unit: suffix } = metric.scale;
  return full === undefined
    ? "no absolute reference: stays fit to this clip"
    : suffix
      ? `full scale ${full} ${suffix}`
      : null;
}
