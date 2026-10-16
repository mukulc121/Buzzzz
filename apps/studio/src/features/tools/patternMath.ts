import { emptyPattern, MAX_PATTERN_MS, patternEnd, toDevice, type Pattern } from "@buzzzz/core";

interface IWarp {
  stretch: number;
  quantizeMs: number;
  reverse: boolean;
}

function mergeTimes<T extends { time: number }>(points: T[]): T[] {
  return [...new Map(points.map((point) => [point.time, point])).values()].sort(
    (a, b) => a.time - b.time,
  );
}

export function warpPattern(pattern: Pattern, options: IWarp): Pattern {
  const end = patternEnd(pattern);
  if (
    !Number.isFinite(options.stretch) ||
    options.stretch < 0.25 ||
    options.stretch > 4 ||
    !Number.isFinite(options.quantizeMs) ||
    options.quantizeMs < 0 ||
    options.quantizeMs > 1000
  )
    throw new Error("Invalid time warp settings");
  const at = (time: number) => {
    const scaled = (options.reverse ? end - time : time) * options.stretch;
    const value = options.quantizeMs
      ? Math.round(scaled / options.quantizeMs) * options.quantizeMs
      : scaled;
    if (value > MAX_PATTERN_MS) throw new Error("The transformed pattern exceeds 60 seconds");
    return Math.round(value);
  };
  return toDevice({
    discretePattern: mergeTimes(
      pattern.discretePattern.map((tap) => ({ ...tap, time: at(tap.time) })),
    ),
    continuousPattern: {
      amplitude: mergeTimes(
        pattern.continuousPattern.amplitude.map((point) => ({ ...point, time: at(point.time) })),
      ),
      frequency: mergeTimes(
        pattern.continuousPattern.frequency.map((point) => ({ ...point, time: at(point.time) })),
      ),
    },
  });
}

type Curve = Pattern["continuousPattern"]["amplitude"];
function valueAt(points: Curve, time: number): number {
  if (!points.length || time < points[0]!.time || time > points.at(-1)!.time) return 0;
  const after = points.findIndex((point) => point.time >= time);
  if (after <= 0) return points[0]!.value;
  const left = points[after - 1]!;
  const right = points[after]!;
  return right.time === left.time
    ? right.value
    : left.value + ((right.value - left.value) * (time - left.time)) / (right.time - left.time);
}

export function snippetRange(pattern: Pattern, start: number, end: number): Pattern {
  if (
    ![start, end].every(Number.isSafeInteger) ||
    start < 0 ||
    end <= start ||
    end > MAX_PATTERN_MS
  )
    throw new Error("Choose a valid range within 60 seconds");
  const clip = (input: Curve): Curve => {
    const points = [...input]
      .map((point) => ({ ...point, time: Math.round(point.time) }))
      .sort((a, b) => a.time - b.time);
    if (!points.length) return [];
    const first = points[0]!;
    const last = points.at(-1)!;
    const silence = [
      ...(first.time > start && first.time < end
        ? [{ time: Math.max(start, first.time - 1) - start, value: 0 }]
        : []),
      ...(last.time > start && last.time < end
        ? [{ time: Math.min(end, last.time + 1) - start, value: 0 }]
        : []),
    ];
    const clipped = mergeTimes([
      { time: 0, value: valueAt(points, start) },
      ...points
        .filter((point) => point.time > start && point.time < end)
        .map((point) => ({ ...point, time: point.time - start })),
      ...silence,
      { time: end - start, value: valueAt(points, end) },
    ]);
    if (clipped.length > 10000) throw new Error("This range contains too many envelope points");
    return clipped;
  };
  const amplitude = clip(pattern.continuousPattern.amplitude);
  return toDevice({
    discretePattern: pattern.discretePattern
      .filter((tap) => tap.time >= start && tap.time <= end)
      .map((tap) => ({ ...tap, time: tap.time - start })),
    continuousPattern: {
      amplitude: amplitude.length
        ? amplitude
        : [
            { time: 0, value: 0 },
            { time: end - start, value: 0 },
          ],
      frequency: clip(pattern.continuousPattern.frequency),
    },
  });
}

export function rhythmPattern(
  times: readonly number[],
  amplitude: number,
  frequency: number,
): Pattern {
  if (![amplitude, frequency].every((value) => Number.isFinite(value) && value >= 0 && value <= 1))
    throw new Error("Intensity and frequency must be between 0 and 1");
  const pattern = emptyPattern();
  pattern.discretePattern = times
    .filter((time) => Number.isFinite(time) && time >= 0 && time <= MAX_PATTERN_MS)
    .slice(0, 1000)
    .map((time) => ({ time, amplitude, frequency }));
  return toDevice(pattern);
}
