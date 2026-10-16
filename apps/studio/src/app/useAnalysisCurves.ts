import { useMemo } from "react";
import { AUDIO_ANALYSES } from "../features/audio/analysis";
import { audioMetricPoints } from "../features/audio/display";
import type { useAudioTrack } from "../features/audio/useAudioTrack";

const COLORS = ["var(--freq)", "var(--ok)", "var(--tap)", "var(--fg-2)", "var(--accent)"];
export function useAnalysisCurves(audio: ReturnType<typeof useAudioTrack>) {
  const { analysis, selectedMetrics, displayMode, decibels } = audio;
  return useMemo(
    () =>
      analysis
        ? selectedMetrics.map((metric, index) => ({
            id: metric,
            label: AUDIO_ANALYSES.find((item) => item.id === metric)?.label ?? metric,
            color: COLORS[index % COLORS.length],
            points: audioMetricPoints(analysis, metric, displayMode, decibels),
          }))
        : [],
    [analysis, selectedMetrics, displayMode, decibels],
  );
}
