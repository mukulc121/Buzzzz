import { isRecord } from "@buzzzz/core";
import { parseChannel } from "./channels";
import type { IAnimationChannel, IAnimationNode } from "./model";

const number = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;
const array = (value: unknown) => (Array.isArray(value) ? value : []);
function scaleChannel(channel: IAnimationChannel, factors: number[]): IAnimationChannel {
  const scale = (values: number[]) => values.map((value, index) => value * (factors[index] ?? 1));
  return {
    value: scale(channel.value),
    keys: channel.keys.map((key) => ({
      ...key,
      start: scale(key.start),
      end: key.end ? scale(key.end) : undefined,
    })),
  };
}

export function collectAnimationNodes(data: Record<string, unknown>, warnings: Set<string>) {
  const nodes: IAnimationNode[] = [];
  const width = number(data.w, 1);
  const height = number(data.h, 1);
  const assets = new Map<string, Record<string, unknown>>();
  for (const asset of array(data.assets))
    if (isRecord(asset) && typeof asset.id === "string") assets.set(asset.id, asset);
  const add = (
    transform: unknown,
    parent: number | null,
    clocks: IAnimationNode["clocks"],
    w: number,
    h: number,
    visible: boolean,
  ) => {
    if (nodes.length >= 512)
      throw new Error("Animation analysis supports up to 512 transform nodes");
    const value = isRecord(transform) ? transform : {};
    const position = isRecord(value.p) ? value.p : {};
    const node: IAnimationNode = {
      parent,
      clocks,
      position: parseChannel(value.p, [0, 0]),
      anchor: parseChannel(value.a, [0, 0]),
      scale: parseChannel(value.s, [100, 100]),
      rotation: parseChannel(value.r ?? value.rz, [0]),
      opacity: parseChannel(value.o, [100]),
      width: Math.max(1, w),
      height: Math.max(1, h),
      visible,
    };
    if (position.s === true) {
      node.positionX = parseChannel(position.x, [0]);
      node.positionY = parseChannel(position.y, [0]);
    }
    nodes.push(node);
    return nodes.length - 1;
  };
  const shapes = (
    items: unknown[],
    parent: number,
    clocks: IAnimationNode["clocks"],
    depth: number,
  ) => {
    if (depth > 16) throw new Error("Animation groups are nested too deeply");
    for (const item of items) {
      if (!isRecord(item) || item.hd === true) continue;
      if (item.ty === "gr") {
        const children = array(item.it);
        const transform = children.find((child) => isRecord(child) && child.ty === "tr");
        shapes(children, add(transform, parent, clocks, 1, 1, false), clocks, depth + 1);
      } else if (item.ty === "el" || item.ty === "rc") {
        const size = parseChannel(item.s, [1, 1]);
        const values = [size.value, ...size.keys.map((key) => key.start)];
        const w = Math.max(1, ...values.map((value) => Math.abs(value[0] ?? 1)));
        const h = Math.max(1, ...values.map((value) => Math.abs(value[1] ?? value[0] ?? 1)));
        const index = add({ p: item.p }, parent, clocks, w, h, true);
        nodes[index].anchor = { value: [w / 2, h / 2], keys: [] };
        nodes[index].scale = scaleChannel(size, [100 / w, 100 / h]);
      } else if (item.ty === "sh") {
        const property = isRecord(item.ks) ? item.ks : {};
        const first = Array.isArray(property.k) ? property.k[0] : property.k;
        const shape = isRecord(first) && Array.isArray(first.s) ? first.s[0] : first;
        if (isRecord(shape) && Array.isArray(shape.v)) {
          if (shape.v.length > 10000)
            throw new Error("Animation paths support up to 10,000 vertices");
          const vertices = shape.v.filter(
            (vertex): vertex is number[] =>
              Array.isArray(vertex) &&
              vertex.length >= 2 &&
              vertex.every((value) => typeof value === "number" && Number.isFinite(value)),
          );
          if (vertices.length) {
            const xs = vertices.map((vertex) => vertex[0]);
            const ys = vertices.map((vertex) => vertex[1]);
            const w = Math.max(...xs) - Math.min(...xs);
            const h = Math.max(...ys) - Math.min(...ys);
            const index = add(
              { p: { k: [Math.min(...xs), Math.min(...ys)] } },
              parent,
              clocks,
              w,
              h,
              true,
            );
            if (property.a === 1)
              warnings.add(
                "Path morphs are rendered but motion analysis uses their initial bounds.",
              );
            nodes[index].width = Math.max(1, w);
          }
        }
      }
    }
  };
  const layers = (
    items: unknown[],
    parent: number | null,
    inherited: IAnimationNode["clocks"],
    seen: Set<string>,
    depth: number,
  ) => {
    if (depth > 16) throw new Error("Animation compositions are nested too deeply");
    const entries: {
      layer: Record<string, unknown>;
      index: number;
      clocks: IAnimationNode["clocks"];
    }[] = [];
    const indices = new Map<number, number>();
    for (const layer of items) {
      if (!isRecord(layer)) throw new Error("Animation layers must be objects");
      const clocks = [
        ...inherited,
        {
          start: number(layer.ip, -1e9),
          end: number(layer.op, 1e9),
          offset: number(layer.st, 0),
          stretch: number(layer.sr, 1) || 1,
        },
      ];
      const visible = layer.hd !== true && layer.ty !== 0 && layer.ty !== 3 && layer.ty !== 4;
      const index = add(
        layer.ks,
        parent,
        clocks,
        number(layer.sw ?? layer.w, width),
        number(layer.sh ?? layer.h, height),
        visible,
      );
      entries.push({ layer, index, clocks });
      if (typeof layer.ind === "number") {
        if (indices.has(layer.ind))
          throw new Error("Animation layer indices must be unique within a composition");
        indices.set(layer.ind, index);
      }
      if (layer.ddd === 1)
        warnings.add("3D transforms are projected to their 2D position, scale and Z rotation.");
      if (layer.tm)
        warnings.add(
          "Time-remapped precompositions are rendered but analyzed using their normal timeline.",
        );
      if (layer.masksProperties || layer.ef)
        warnings.add("Masks and visual effects do not alter the transform-based motion estimate.");
    }
    for (const { layer, index, clocks } of entries) {
      if (typeof layer.parent === "number")
        nodes[index].parent = indices.get(layer.parent) ?? parent;
      if (layer.hd === true) continue;
      if (layer.ty === 4) shapes(array(layer.shapes), index, clocks, 0);
      if (layer.ty === 0 && typeof layer.refId === "string") {
        if (seen.has(layer.refId)) throw new Error("Animation precompositions contain a cycle");
        const asset = assets.get(layer.refId);
        if (asset)
          layers(array(asset.layers), index, clocks, new Set([...seen, layer.refId]), depth + 1);
      }
    }
  };
  layers(array(data.layers), null, [], new Set(), 0);
  for (let index = 0; index < nodes.length; index++) {
    const seen = new Set<number>([index]);
    let parent = nodes[index].parent;
    while (parent !== null) {
      if (seen.has(parent)) throw new Error("Animation parent transforms contain a cycle");
      seen.add(parent);
      parent = nodes[parent].parent;
    }
  }
  return nodes;
}
