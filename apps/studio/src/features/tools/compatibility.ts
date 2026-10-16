import type { Pattern } from "@buzzzz/core";

export type HapticTier = "full" | "amplitude" | "basic" | "none";

export function compatibilityIssues(pattern: Pattern, tier: HapticTier): string[] {
  const issues: string[] = [];
  const frequency =
    pattern.continuousPattern.frequency.length > 0 ||
    pattern.discretePattern.some((tap) => tap.frequency !== 0.5);
  const envelope = pattern.continuousPattern.amplitude.length > 0;
  if (tier === "none") return ["This device tier cannot play haptics."];
  if (tier !== "full" && frequency) issues.push("Frequency changes are lost on this device tier.");
  if (tier === "basic" && (envelope || pattern.discretePattern.some((tap) => tap.amplitude !== 1)))
    issues.push("Only timing remains. Intensity is fixed by the device.");
  if (envelope && pattern.discretePattern.length)
    issues.push("Overlapping taps and envelopes can combine differently across devices.");
  const hasShortGap = (points: { time: number }[], limit: number) =>
    [...points]
      .sort((a, b) => a.time - b.time)
      .some((point, index, sorted) => index > 0 && point.time - sorted[index - 1]!.time < limit);
  if (hasShortGap(pattern.discretePattern, 10))
    issues.push("Taps less than 10 ms apart may merge on some actuators.");
  if (
    hasShortGap(pattern.continuousPattern.amplitude, 20) ||
    hasShortGap(pattern.continuousPattern.frequency, 20)
  )
    issues.push("Envelope segments shorter than 20 ms may be smoothed by the actuator.");
  return issues;
}
