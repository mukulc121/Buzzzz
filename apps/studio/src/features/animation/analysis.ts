import type { IAnimationAnalysis, IAnimationDocument, IAnimationMotionLayer } from "./model";
import { sampleMotion } from "./motionSampling";
import { centeredAverage, derivative, normalize, peaks } from "./signals";

export function analyzeAnimation(
  document: IAnimationDocument,
  requestedFrameMs = 1000 / 240,
  smoothingMs = 12,
): IAnimationAnalysis {
  if (!Number.isFinite(requestedFrameMs) || !Number.isFinite(smoothingMs))
    throw new Error("Animation sample duration and smoothing must be finite");
  const frameMs = Math.min(100, Math.max(2, requestedFrameMs));
  const { durationMs, count, layers: sampled } = sampleMotion(document, frameMs);
  const seconds = frameMs / 1000;
  const width = Math.max(1, Math.round(smoothingMs / frameMs));
  const diagonal = Math.hypot(document.width, document.height) || 1;
  const energy = new Float32Array(count);
  const transient = new Float32Array(count);
  const acceleration = new Float32Array(count);
  const positionRate = new Float32Array(count);
  const scaleRate = new Float32Array(count);
  const rotationRate = new Float32Array(count);
  const opacityRate = new Float32Array(count);
  const layers: IAnimationMotionLayer[] = [];
  const rate = (values: Float32Array) =>
    centeredAverage(derivative(values, seconds).map(Math.abs), width);
  for (const layer of sampled) {
    const vx = derivative(layer.x, seconds);
    const vy = derivative(layer.y, seconds);
    const speed = centeredAverage(
      vx.map((value, index) => Math.hypot(value, vy[index])),
      width,
    );
    const scaling = rate(layer.scales);
    const rotation = rate(layer.rotations);
    const opacity = rate(layer.opacities);
    const motion = speed.map(
      (value, index) =>
        value / diagonal +
        (2 * rotation[index]) / 360 +
        1.5 * scaling[index] +
        0.6 * opacity[index],
    );
    const accel = rate(motion);
    const jerk = rate(accel);
    let x = 0;
    let y = 0;
    let active = 0;
    for (let index = 0; index < count; index++)
      if (layer.active[index]) {
        x += layer.x[index];
        y += layer.y[index];
        active++;
      }
    const distance =
      active > 0
        ? Math.hypot(
            (x / active - document.width / 2) / (document.width / 2 || 1),
            (y / active - document.height / 2) / (document.height / 2 || 1),
          )
        : 0;
    const weight = layer.ignored
      ? 0
      : Math.min(1, layer.area / (document.width * document.height || 1)) *
        (1 - 0.7 * Math.min(1, distance / Math.SQRT2));
    layers.push({
      weight,
      area: layer.area,
      x: layer.x,
      y: layer.y,
      vx,
      vy,
      speed,
      scale: layer.scales,
      rotation: layer.rotations,
    });
    for (let index = 0; index < count; index++) {
      const prominence = weight * layer.opacities[index] * layer.active[index];
      if (prominence <= 0) continue;
      energy[index] += prominence * motion[index];
      transient[index] += prominence * jerk[index];
      acceleration[index] += prominence * accel[index];
      positionRate[index] += (prominence * speed[index]) / diagonal;
      scaleRate[index] += prominence * scaling[index];
      rotationRate[index] += (prominence * rotation[index]) / 360;
      opacityRate[index] += prominence * opacity[index];
    }
  }
  const channels = [
    normalize(centeredAverage(energy, width)),
    normalize(transient),
    normalize(acceleration),
    normalize(positionRate),
    normalize(scaleRate),
    normalize(rotationRate),
    normalize(opacityRate),
  ];
  const frames = Array.from({ length: count }, (_, index) => ({
    timeMs: index * frameMs,
    energy: channels[0][index],
    transient: channels[1][index],
    acceleration: channels[2][index],
    positionRate: channels[3][index],
    scaleRate: channels[4][index],
    rotationRate: channels[5][index],
    opacityRate: channels[6][index],
  }));
  const impacts = peaks(channels[1], frameMs, 0.005, 2).map((index) => ({
    timeMs: index * frameMs,
    strength: channels[1][index],
  }));
  return {
    durationMs,
    frameMs,
    frames,
    impacts,
    warnings: document.warnings,
    width: document.width,
    height: document.height,
    layers,
  };
}
