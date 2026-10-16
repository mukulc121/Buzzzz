import { sampleChannel } from "./channels";
import type { IAnimationDocument } from "./model";

interface ITransform {
  a: number;
  b: number;
  c: number;
  d: number;
  x: number;
  y: number;
  opacity: number;
  active: boolean;
}

export function sampleTransforms(document: IAnimationDocument, globalFrame: number) {
  const cache: (ITransform | undefined)[] = new Array(document.nodes.length);
  const resolve = (index: number): ITransform => {
    const cached = cache[index];
    if (cached) return cached;
    const node = document.nodes[index];
    let frame = globalFrame;
    let active = true;
    for (const clock of node.clocks) {
      active &&= frame >= clock.start && frame < clock.end;
      frame = (frame - clock.offset) / clock.stretch;
    }
    const position = sampleChannel(node.position, frame);
    const x = node.positionX ? sampleChannel(node.positionX, frame)[0] : (position[0] ?? 0);
    const y = node.positionY ? sampleChannel(node.positionY, frame)[0] : (position[1] ?? 0);
    const anchor = sampleChannel(node.anchor, frame);
    const scale = sampleChannel(node.scale, frame);
    const angle = ((sampleChannel(node.rotation, frame)[0] ?? 0) * Math.PI) / 180;
    const opacity = Math.max(0, Math.min(1, (sampleChannel(node.opacity, frame)[0] ?? 100) / 100));
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    const a = (cosine * (scale[0] ?? 100)) / 100;
    const b = (sine * (scale[0] ?? 100)) / 100;
    const c = (-sine * (scale[1] ?? 100)) / 100;
    const d = (cosine * (scale[1] ?? 100)) / 100;
    const tx = x - a * (anchor[0] ?? 0) - c * (anchor[1] ?? 0);
    const ty = y - b * (anchor[0] ?? 0) - d * (anchor[1] ?? 0);
    const parent = node.parent === null ? undefined : resolve(node.parent);
    const result = parent
      ? {
          a: parent.a * a + parent.c * b,
          b: parent.b * a + parent.d * b,
          c: parent.a * c + parent.c * d,
          d: parent.b * c + parent.d * d,
          x: parent.a * tx + parent.c * ty + parent.x,
          y: parent.b * tx + parent.d * ty + parent.y,
          opacity: parent.opacity * opacity,
          active,
        }
      : { a, b, c, d, x: tx, y: ty, opacity, active };
    cache[index] = result;
    return result;
  };
  return document.nodes.map((node, index) => {
    const transform = resolve(index);
    return {
      x: (transform.a * node.width) / 2 + (transform.c * node.height) / 2 + transform.x,
      y: (transform.b * node.width) / 2 + (transform.d * node.height) / 2 + transform.y,
      area:
        Math.abs(transform.a * transform.d - transform.b * transform.c) * node.width * node.height,
      scale: (Math.hypot(transform.a, transform.b) + Math.hypot(transform.c, transform.d)) / 2,
      angle: Math.atan2(transform.b, transform.a),
      opacity: transform.opacity,
      visible: node.visible && transform.active && transform.opacity > 0.001,
    };
  });
}
