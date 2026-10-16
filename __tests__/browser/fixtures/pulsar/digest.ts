import { createHash } from "node:crypto";
import type { Pattern } from "@buzzzz/core";

export function patternDigest(pattern: Pattern) {
  const { discretePattern, continuousPattern } = pattern;
  const points = (list: Pattern["continuousPattern"]["amplitude"]) =>
    list.map(({ time, value }) => [time, value]);
  const canonical = JSON.stringify([
    discretePattern.map(({ time, amplitude, frequency }) => [time, amplitude, frequency]),
    points(continuousPattern.amplitude),
    points(continuousPattern.frequency),
  ]);
  return createHash("sha256").update(canonical).digest("hex");
}
