import type { IAnimationAnalysis, IAnimationDocument, IAnimationFrame } from "./model";
import { sampleTransforms } from "./transforms";

const unit = (value: number) => Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
export function analyzeAnimation(
  document: IAnimationDocument,
  requestedFrameMs = 1000 / 240,
): IAnimationAnalysis {
  if (!Number.isFinite(requestedFrameMs))
    throw new Error("Animation sample duration must be finite");
  const frameMs = Math.min(100, Math.max(2, requestedFrameMs));
  const durationMs = Math.min(60000, document.durationMs);
  const count = Math.ceil(durationMs / frameMs);
  const diagonal = Math.hypot(document.width, document.height);
  const dt = frameMs / 1000;
  const frames: IAnimationFrame[] = [];
  let previous: (ReturnType<typeof sampleTransforms>[number] & { vx: number; vy: number })[] = [];
  for (let index = 0; index < count; index++) {
    const timeMs = index * frameMs;
    const transforms = sampleTransforms(
      document,
      document.inFrame + (timeMs / 1000) * document.frameRate,
    );
    let energy = 0;
    let velocity = 0;
    let acceleration = 0;
    let direction = 0;
    let impulse = 0;
    let positionX = 0;
    let positionY = 0;
    let scale = 0;
    let rotation = 0;
    let opacity = 0;
    let total = 0;
    const next: typeof previous = [];
    for (let node = 0; node < transforms.length; node++) {
      const current = transforms[node];
      const before = previous[node];
      const weight = (current.area / (document.width * document.height)) * current.opacity;
      const moving = current.visible && before?.visible;
      const vx = moving ? (current.x - before.x) / dt / diagonal : 0;
      const vy = moving ? (current.y - before.y) / dt / diagonal : 0;
      next.push({ ...current, vx, vy });
      if (!current.visible) continue;
      const speed = Math.hypot(vx, vy);
      const oldSpeed = before ? Math.hypot(before.vx, before.vy) : 0;
      const delta = before ? Math.hypot(vx - before.vx, vy - before.vy) : 0;
      const scaleSpeed = moving ? (current.scale - before.scale) / dt : 0;
      const angleDelta = moving
        ? Math.atan2(Math.sin(current.angle - before.angle), Math.cos(current.angle - before.angle))
        : 0;
      const angularSpeed = angleDelta / Math.PI / dt;
      const turn =
        oldSpeed > 1e-6 && speed > 1e-6
          ? unit((1 - (vx * before.vx + vy * before.vy) / (speed * oldSpeed)) / 2)
          : oldSpeed > 1e-6 && speed < 1e-6
            ? 1
            : 0;
      energy += weight * (speed ** 2 + scaleSpeed ** 2 * 0.1 + angularSpeed ** 2 * 0.1);
      velocity += weight * speed;
      acceleration += (weight * delta) / dt;
      direction += weight * turn;
      impulse += weight * delta;
      positionX += (weight * current.x) / document.width;
      positionY += (weight * current.y) / document.height;
      scale += (weight * current.scale) / 2;
      rotation += weight * (current.angle / (2 * Math.PI) + 0.5);
      opacity += weight * current.opacity;
      total += weight;
    }
    const denominator = Math.max(1e-10, total);
    frames.push({
      timeMs,
      energy: Math.sqrt(energy / denominator),
      velocity: velocity / denominator,
      acceleration: acceleration / denominator,
      directionChange: unit(direction / denominator),
      impulse,
      positionX: unit(positionX / denominator),
      positionY: unit(positionY / denominator),
      scale: unit(scale / denominator),
      rotation: unit(rotation / denominator),
      opacity: unit(opacity / denominator),
    });
    previous = next;
  }
  for (const field of [
    "energy",
    "velocity",
    "acceleration",
    "impulse",
  ] satisfies (keyof IAnimationFrame)[]) {
    let maximum = 0;
    for (const frame of frames) maximum = Math.max(maximum, frame[field]);
    for (const frame of frames) frame[field] = maximum > 1e-10 ? unit(frame[field] / maximum) : 0;
  }
  const impacts: IAnimationAnalysis["impacts"] = [];
  for (let index = 1; index < frames.length - 1; index++) {
    const frame = frames[index];
    if (
      frame.acceleration < 0.005 ||
      frame.acceleration < frames[index - 1].acceleration ||
      frame.acceleration < frames[index + 1].acceleration ||
      (frame.acceleration === frames[index - 1].acceleration &&
        frame.acceleration === frames[index + 1].acceleration)
    )
      continue;
    const previousImpact = impacts.at(-1);
    const impact = { timeMs: frame.timeMs, strength: frame.acceleration, momentum: frame.impulse };
    if (previousImpact && frame.timeMs - previousImpact.timeMs < 2) {
      if (frame.acceleration > previousImpact.strength) impacts[impacts.length - 1] = impact;
    } else impacts.push(impact);
  }
  return { durationMs, frameMs, frames, impacts, warnings: document.warnings };
}
