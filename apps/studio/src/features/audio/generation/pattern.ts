import { toDevice } from "@buzzzz/core";
import type { Pattern } from "@buzzzz/core";
import type { IPulsarPattern } from "./model";

// Pulsar's intensity/frequency/discrete layers as the app's Pattern.
export function toPattern(pattern: IPulsarPattern): Pattern {
  return toDevice({
    discretePattern: pattern.discrete.map((event) => ({
      time: event.time,
      amplitude: event.intensity,
      frequency: event.frequency,
    })),
    continuousPattern: { amplitude: pattern.intensity, frequency: pattern.frequency },
  });
}
