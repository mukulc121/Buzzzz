import {
  emptyPattern,
  isRiveConfig,
  patternEnd,
  type IRiveConfig,
  type Pattern,
} from "@buzzzz/core";
import { riveProfileOccurrences } from "@buzzzz/core/presets";

export interface IRiveCueTimeline {
  durationMs: number;
  readyAtMs: number;
  exitAtMs: number;
  pattern: Pattern;
  segments: readonly Pattern[];
}

type TOccurrence = NonNullable<ReturnType<typeof riveProfileOccurrences>>["occurrences"][number];
type TCurve = Pattern["continuousPattern"]["amplitude"];
const MAX_POINTS = 10000;

function clippedCurve(points: TCurve, end: number, offset: number): TCurve {
  const sorted = [...points].sort((a, b) => a.time - b.time);
  const curve = sorted.filter((point) => point.time <= end);
  const last = curve.at(-1);
  if (!last) return [];
  if (last.time < end) {
    const next = sorted.find((point) => point.time > end);
    const value = next
      ? last.value + ((end - last.time) / (next.time - last.time)) * (next.value - last.value)
      : last.value;
    curve.push({ time: end, value });
  }
  return curve.map((point) => ({ time: point.time + offset, value: point.value }));
}

function occurrencePattern(occurrence: TOccurrence): Pattern {
  const { pattern, timeMs, durationMs } = occurrence;
  const amplitude = clippedCurve(pattern.continuousPattern.amplitude, durationMs, timeMs);
  if (amplitude[0]?.value) amplitude.unshift({ time: amplitude[0].time, value: 0 });
  const last = amplitude.at(-1);
  if (last?.value) amplitude.push({ time: last.time, value: 0 });
  const truncated = durationMs < patternEnd(pattern);
  return {
    discretePattern: pattern.discretePattern
      .filter((tap) => (truncated ? tap.time < durationMs : tap.time <= durationMs))
      .map((tap) => ({ ...tap, time: tap.time + timeMs })),
    continuousPattern: {
      amplitude,
      frequency: clippedCurve(pattern.continuousPattern.frequency, durationMs, timeMs),
    },
  };
}

export function deriveRiveCueTimeline(
  config: IRiveConfig | undefined,
  readyAtMs = config?.completion?.readyAfterMs,
): IRiveCueTimeline | null {
  if (
    !isRiveConfig(config) ||
    !config.completion?.phases ||
    !config.haptics ||
    readyAtMs === undefined ||
    !Number.isFinite(readyAtMs) ||
    readyAtMs < 0
  )
    return null;
  const completion = config.completion;
  const loops = Math.max(1, Math.ceil((readyAtMs - completion.entryMs) / completion.loopPeriodMs));
  const extent =
    completion.entryMs + loops * completion.loopPeriodMs + completion.exitMs + completion.marginMs;
  if (!Number.isFinite(extent)) return null;
  for (const action of Object.values(config.haptics)) {
    if (
      action.kind === "sequence" &&
      action.repeatMs !== undefined &&
      Math.ceil(extent / action.repeatMs) * action.cues.length > MAX_POINTS
    )
      return null;
  }
  const timeline = riveProfileOccurrences(config, { readyAtMs });
  if (!timeline || !Number.isFinite(timeline.durationMs) || !timeline.occurrences.length)
    return null;
  const segments = timeline.occurrences.map(occurrencePattern);
  const pattern = emptyPattern();
  for (const segment of segments) {
    pattern.discretePattern.push(...segment.discretePattern);
    pattern.continuousPattern.amplitude.push(...segment.continuousPattern.amplitude);
    pattern.continuousPattern.frequency.push(...segment.continuousPattern.frequency);
  }
  if (
    pattern.discretePattern.length +
      pattern.continuousPattern.amplitude.length +
      pattern.continuousPattern.frequency.length >
    MAX_POINTS
  )
    return null;
  return {
    durationMs: timeline.durationMs,
    readyAtMs: timeline.readyAtMs,
    exitAtMs: timeline.exitAtMs,
    pattern,
    segments,
  };
}
