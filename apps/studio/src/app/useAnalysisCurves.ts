import { useMemo } from "react";
import { metricPoints } from "../features/audio/metrics/display";
import { metricById } from "../features/audio/metrics";
import type { useAudioTrack } from "../features/audio/useAudioTrack";

export function useAnalysisCurves(audio: ReturnType<typeof useAudioTrack>) {
  const { series, valueAxis, dbCurve } = audio.metrics;
  return useMemo(
    () =>
      Object.entries(series).flatMap(([id, values]) => {
        const metric = metricById(id);
        if (!metric) return [];
        const points = metricPoints(values, metric.scale, valueAxis, dbCurve);
        return points.length < 2 ? [] : [{ id, label: metric.label, color: metric.color, points }];
      }),
    [series, valueAxis, dbCurve],
  );
}
