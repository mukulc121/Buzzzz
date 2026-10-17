import { isRecord } from "@buzzzz/core";
import { parseChannel, sampleChannel } from "./channels";
import type { IAnimationDocument } from "./model";

const number = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

export function sampleMotion(document: IAnimationDocument, stepMs: number) {
  const { data, width, height, frameRate, inFrame } = document;
  const durationMs = Math.min(60000, document.durationMs);
  const count = Math.max(2, Math.round(durationMs / stepMs) + 1);
  const assets = new Map<string, number>();
  if (Array.isArray(data.assets))
    for (const asset of data.assets)
      if (isRecord(asset) && typeof asset.id === "string")
        assets.set(asset.id, number(asset.w, 0) * number(asset.h, 0));
  const layers = (Array.isArray(data.layers) ? data.layers : [])
    .filter(isRecord)
    .map((layer, index) => {
      const transform = isRecord(layer.ks) ? layer.ks : {};
      const assetArea = typeof layer.refId === "string" ? assets.get(layer.refId) : undefined;
      const ownArea = number(layer.w, 0) * number(layer.h, 0);
      return {
        index: number(layer.ind, index),
        parent: typeof layer.parent === "number" ? layer.parent : null,
        ignored: layer.hd === true || layer.ty === 3 || layer.ty === 6 || layer.ty === 13,
        start: number(layer.ip, inFrame),
        end: number(layer.op, inFrame + (durationMs * frameRate) / 1000),
        area:
          assetArea && assetArea > 0 ? assetArea : ownArea > 0 ? ownArea : width * height * 0.25,
        position: parseChannel(transform.p, [0, 0]),
        anchor: parseChannel(transform.a, [0, 0]),
        scale: parseChannel(transform.s, [100, 100]),
        rotation: parseChannel(transform.r, [0]),
        opacity: parseChannel(transform.o, [100]),
        x: new Float32Array(count),
        y: new Float32Array(count),
        scales: new Float32Array(count),
        rotations: new Float32Array(count),
        opacities: new Float32Array(count),
        active: new Uint8Array(count),
      };
    });
  const byIndex = new Map(layers.map((layer) => [layer.index, layer]));
  for (let index = 0; index < count; index++) {
    const frame = inFrame + (index * stepMs * frameRate) / 1000;
    const cache = new Map<number, number[]>();
    const resolve = (layer: (typeof layers)[number], visited: Set<number>): number[] => {
      const cached = cache.get(layer.index);
      if (cached) return cached;
      const position = sampleChannel(layer.position, frame, true);
      const anchor = sampleChannel(layer.anchor, frame);
      const scale = sampleChannel(layer.scale, frame);
      const angle = ((sampleChannel(layer.rotation, frame)[0] ?? 0) * Math.PI) / 180;
      const a = (Math.cos(angle) * (scale[0] ?? 100)) / 100;
      const b = (Math.sin(angle) * (scale[0] ?? 100)) / 100;
      const c = (-Math.sin(angle) * (scale[1] ?? scale[0] ?? 100)) / 100;
      const d = (Math.cos(angle) * (scale[1] ?? scale[0] ?? 100)) / 100;
      const x = (position[0] ?? 0) - a * (anchor[0] ?? 0) - c * (anchor[1] ?? 0);
      const y = (position[1] ?? 0) - b * (anchor[0] ?? 0) - d * (anchor[1] ?? 0);
      let result = [a, b, c, d, x, y];
      const parent = layer.parent === null ? undefined : byIndex.get(layer.parent);
      if (parent && !visited.has(parent.index)) {
        visited.add(layer.index);
        const p = resolve(parent, visited);
        result = [
          p[0] * a + p[2] * b,
          p[1] * a + p[3] * b,
          p[0] * c + p[2] * d,
          p[1] * c + p[3] * d,
          p[0] * x + p[2] * y + p[4],
          p[1] * x + p[3] * y + p[5],
        ];
      }
      cache.set(layer.index, result);
      return result;
    };
    for (const layer of layers) {
      const matrix = resolve(layer, new Set([layer.index]));
      const anchor = sampleChannel(layer.anchor, frame);
      layer.x[index] = matrix[0] * (anchor[0] ?? 0) + matrix[2] * (anchor[1] ?? 0) + matrix[4];
      layer.y[index] = matrix[1] * (anchor[0] ?? 0) + matrix[3] * (anchor[1] ?? 0) + matrix[5];
      layer.scales[index] = Math.sqrt(Math.abs(matrix[0] * matrix[3] - matrix[1] * matrix[2]));
      layer.rotations[index] = sampleChannel(layer.rotation, frame)[0] ?? 0;
      layer.opacities[index] = Math.max(
        0,
        Math.min(1, (sampleChannel(layer.opacity, frame)[0] ?? 100) / 100),
      );
      layer.active[index] = frame >= layer.start && frame < layer.end ? 1 : 0;
    }
  }
  return { durationMs, count, layers };
}
