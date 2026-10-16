import { beatGrid } from "./beatGrid";
import { filterChain } from "./filterChain";
import { impactFollower } from "./impactFollower";
import { melodicTranscode } from "./melodicTranscode";
import { multibandSplit } from "./multibandSplit";
import { percussiveHarmonic } from "./percussiveHarmonic";
import { perceptualLoudness } from "./perceptualLoudness";
import { rmsEnvelope } from "./rmsEnvelope";
import { transientTaps } from "./transientTaps";

// Pulsar's worker order, which is also the order of the approach list.
export const STRATEGIES = [
  multibandSplit,
  transientTaps,
  percussiveHarmonic,
  impactFollower,
  rmsEnvelope,
  filterChain,
  perceptualLoudness,
  beatGrid,
  melodicTranscode,
];
