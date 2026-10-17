import { patternEnd } from "@buzzzz/core";
import type { ICachedPattern } from "./model";

export function receivedPatternRecord(
  packet: Pick<ICachedPattern, "resourceId" | "name" | "version" | "pattern">,
  receivedAt: number,
): ICachedPattern {
  const { pattern } = packet;
  return {
    resourceId: packet.resourceId,
    name: packet.name,
    kind: "pattern",
    version: packet.version,
    durationMs: patternEnd(pattern),
    pattern: {
      discretePattern: pattern.discretePattern.map((point) => ({ ...point })),
      continuousPattern: {
        amplitude: pattern.continuousPattern.amplitude.map((point) => ({ ...point })),
        frequency: pattern.continuousPattern.frequency.map((point) => ({ ...point })),
      },
    },
    receivedAt,
  };
}
