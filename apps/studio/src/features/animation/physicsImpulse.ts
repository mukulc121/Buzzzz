import type { IAnimationAnalysis } from "./model";
import { normalize, peaks } from "./signals";
import { unit } from "./generationCurves";

export function physicsImpulse(analysis: IAnimationAnalysis, params: Record<string, number>) {
  const layers = analysis.layers.filter((layer) => layer.weight > 0);
  const count = analysis.frames.length;
  const area = analysis.width * analysis.height || 1;
  const diagonal = Math.hypot(analysis.width, analysis.height) || 1;
  const masses = layers.map((layer) =>
    layer.scale.map((scale) => Math.min(2, (layer.area * scale * scale) / area)),
  );
  const speeds = layers.map((layer) => layer.speed.map((speed) => speed / diagonal));
  const momenta = layers.map((_, index) =>
    masses[index].map((mass, frame) => mass * speeds[index][frame]),
  );
  const impulse = new Float32Array(count);
  const strongest = new Float32Array(count);
  const mass = new Float32Array(count);
  const speed = new Float32Array(count);
  const add = (index: number, strength: number, objectMass: number, objectSpeed: number) => {
    impulse[index] += strength;
    if (strength > strongest[index]) {
      strongest[index] = strength;
      mass[index] = objectMass;
      speed[index] = objectSpeed;
    }
  };
  for (let node = 0; node < layers.length; node++) {
    const layer = layers[node];
    for (let index = 1; index < count - 1; index++) {
      const lost = Math.max(0, momenta[node][index - 1] - momenta[node][index + 1]);
      const reverses =
        (layer.vx[index - 1] * layer.vx[index + 1] < 0 ||
          layer.vy[index - 1] * layer.vy[index + 1] < 0) &&
        speeds[node][index] > 0.02;
      const strength = layer.weight * (lost + (reverses ? 0.5 * momenta[node][index] : 0));
      if (strength > 0) add(index, strength, masses[node][index], speeds[node][index]);
    }
  }
  if (layers.length >= 2 && layers.length <= 12)
    for (let left = 0; left < layers.length; left++)
      for (let right = left + 1; right < layers.length; right++) {
        let separated = true;
        for (let index = 0; index < count; index++) {
          const a = layers[left];
          const b = layers[right];
          const overlapping =
            Math.hypot(a.x[index] - b.x[index], a.y[index] - b.y[index]) <=
            Math.sqrt(a.area / Math.PI) * a.scale[index] +
              Math.sqrt(b.area / Math.PI) * b.scale[index];
          const moving = speeds[left][index] > 0.02 || speeds[right][index] > 0.02;
          if (overlapping && separated && moving) {
            const strength =
              a.weight *
              b.weight *
              (Math.abs(momenta[left][index] - momenta[right][index]) + 0.001) *
              4;
            add(
              index,
              strength,
              Math.max(masses[left][index], masses[right][index]),
              Math.max(speeds[left][index], speeds[right][index]),
            );
          }
          separated = !overlapping;
        }
      }
  const normalized = normalize(impulse);
  let fastest = 0;
  for (const value of speed) fastest = Math.max(fastest, value);
  return peaks(normalized, analysis.frameMs, params.threshold ?? 0.15, params.minGapMs ?? 70).map(
    (index) => ({
      time: Math.round(index * analysis.frameMs),
      amplitude: unit(normalized[index] * (params.gain ?? 1.3)),
      frequency: unit(
        0.55 +
          0.35 * (fastest > 0 ? speed[index] / fastest : 0) -
          (params.massInfluence ?? 0.5) * 0.5 * unit(mass[index]),
      ),
    }),
  );
}
