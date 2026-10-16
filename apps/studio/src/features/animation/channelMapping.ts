import type { IAnimationAnalysis } from "./model";
import { peaks } from "./signals";
import { unit } from "./generationCurves";

export function mapAnimationChannels(analysis: IAnimationAnalysis, params: Record<string, number>) {
  const amplitude = new Float32Array(analysis.frames.length);
  const frequency = new Float32Array(amplitude.length);
  const transients = new Float32Array(amplitude.length);
  for (let index = 0; index < amplitude.length; index++) {
    const frame = analysis.frames[index];
    amplitude[index] = unit(
      (params.positionGain ?? 1) * frame.positionRate +
        (params.scaleGain ?? 1) * frame.scaleRate +
        (params.rotationToIntensity ?? 1) * frame.rotationRate +
        (params.opacityGain ?? 0.6) * frame.opacityRate,
    );
    frequency[index] = unit(0.3 + (params.rotationToFreq ?? 0.8) * frame.rotationRate);
    transients[index] = unit(0.6 * frame.scaleRate + 0.6 * frame.opacityRate);
  }
  const events = peaks(transients, analysis.frameMs, 0.25, 80).map((index) => ({
    time: Math.round(index * analysis.frameMs),
    amplitude: unit(0.3 + 0.7 * transients[index]),
    frequency: unit(0.6 + 0.3 * analysis.frames[index].scaleRate),
  }));
  const detents = params.detentsPerTurn ?? 4;
  let dominant: IAnimationAnalysis["layers"][number] | null = null;
  let prominence = 0;
  for (const layer of analysis.layers) {
    if (layer.weight <= 0) continue;
    let min = Infinity;
    let max = -Infinity;
    for (const value of layer.rotation) {
      min = Math.min(min, value);
      max = Math.max(max, value);
    }
    const score = layer.weight * (max - min);
    if (score > prominence) {
      prominence = score;
      dominant = layer;
    }
  }
  if (detents > 0 && dominant) {
    const degrees = 360 / detents;
    let previous = Math.floor(dominant.rotation[0] / degrees);
    let lastTime = -Infinity;
    for (let index = 1; index < amplitude.length; index++) {
      const current = Math.floor(dominant.rotation[index] / degrees);
      if (current !== previous) {
        const time = Math.round(index * analysis.frameMs);
        if (time - lastTime >= 40) {
          const sampled = Math.min(
            amplitude.length - 1,
            Math.max(0, Math.round(time / analysis.frameMs)),
          );
          events.push({
            time,
            amplitude: unit(0.35 + 0.5 * analysis.frames[sampled].rotationRate),
            frequency: 0.7,
          });
          lastTime = time;
        }
        previous = current;
      }
    }
  }
  return { amplitude, frequency, events };
}
