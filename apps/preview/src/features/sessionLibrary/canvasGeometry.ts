import type { Pattern } from "@buzzzz/core";

const unit = (value: number) => Math.max(0, Math.min(1, value));

export function frequencyColor(frequency: number): string {
  const hue = Math.round(220 - unit(frequency) * 200) / 60;
  const chroma = 0.63;
  const secondary = chroma * (1 - Math.abs((hue % 2) - 1));
  const channels =
    hue < 1
      ? [chroma, secondary, 0]
      : hue < 2
        ? [secondary, chroma, 0]
        : hue < 3
          ? [0, chroma, secondary]
          : [0, secondary, chroma];
  return `rgba(${channels.map((channel) => Math.round((channel + 0.135) * 255)).join(", ")}, 1)`;
}

export function patternCanvasGeometry(
  pattern: Pattern,
  durationMs: number,
  width: number,
  height: number,
) {
  const duration = Math.max(1, durationMs);
  const x = (time: number) => 3 + (time / duration) * (width - 6);
  const y = (value: number) => height - unit(value) * (height - 6) - 3;
  const line =
    width > 0
      ? pattern.continuousPattern.amplitude
          .map(
            (point, index) =>
              `${index ? "L" : "M"}${x(point.time).toFixed(1)},${y(point.value).toFixed(1)}`,
          )
          .join(" ")
      : "";
  return {
    line,
    area: line ? `${line} L${x(duration)},${height} L${x(0)},${height} Z` : "",
    gradient: pattern.continuousPattern.frequency.map((point) => ({
      offset: unit(point.time / duration),
      color: frequencyColor(point.value),
    })),
    impulses: pattern.discretePattern.map((point) => ({
      x: x(point.time),
      y: y(point.amplitude),
      color: frequencyColor(point.frequency),
    })),
    baseline: height - 3,
  };
}

export function formatLibraryTime(durationMs: number): string {
  const seconds = Math.max(0, Math.round(durationMs / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function scrubTime(x: number, width: number, durationMs: number): number {
  return width > 0 ? unit(x / width) * Math.max(0, durationMs) : 0;
}
