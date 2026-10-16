import type { Pattern } from "@buzzzz/core";
import { tapsPattern } from "../shared/patterns";
import bounce from "./bounce.json";

interface IKeyframe {
  t: number;
  s: number[];
}

export const BOUNCE = bounce;
export const BOUNCE_MS = ((bounce.op - bounce.ip) / bounce.fr) * 1000;

// Every keyframe where the ball reaches the ground becomes a tap, scaled by the drop height.
export function contactTaps() {
  const ball = bounce.layers.find((layer) => layer.nm === "ball");
  const frames = (ball?.ks.p.k ?? []) as IKeyframe[];
  const ground = Math.max(...frames.map((frame) => frame.s[1]));
  const drops = frames.flatMap((frame, i) =>
    i > 0 && frame.s[1] === ground ? [{ frame: frame.t, drop: ground - frames[i - 1].s[1] }] : [],
  );
  const tallest = Math.max(...drops.map((d) => d.drop));
  return drops.map((d) => ({
    time: Math.round((d.frame / bounce.fr) * 1000),
    amplitude: Math.round((0.25 + 0.75 * (d.drop / tallest)) * 100) / 100,
    frequency: 0.35,
  }));
}

export const bouncePattern = (): Pattern => tapsPattern(contactTaps());
