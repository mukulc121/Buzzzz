import type { AudioMetric, IAudioAnalysis } from "./model";

export function audioMetricPoints(
  analysis: IAudioAnalysis,
  metric: AudioMetric,
  displayMode: "fit" | "true",
  decibels: boolean,
) {
  let peak = displayMode === "fit" ? 0 : 1;
  if (displayMode === "fit")
    for (const frame of analysis.frames) peak = Math.max(peak, frame[metric]);
  return analysis.frames.map((frame) => {
    const scaled = peak > 1e-10 ? Math.min(1, frame[metric] / peak) : 0;
    const rawValue = decibels ? Math.max(-60, 20 * Math.log10(Math.max(1e-3, scaled))) : scaled;
    return { time: frame.timeMs, value: decibels ? (rawValue + 60) / 60 : rawValue, rawValue };
  });
}
