import { isRecord } from "@buzzzz/core";
import { collectAnimationNodes } from "./layers";
import type { IAnimationDocument } from "./model";

export function parseAnimationData(value: unknown): IAnimationDocument {
  if (!isRecord(value) || !Array.isArray(value.layers))
    throw new Error("Choose a Lottie animation containing layers");
  const { fr, ip, op, w, h } = value;
  if (
    typeof fr !== "number" ||
    !Number.isFinite(fr) ||
    fr <= 0 ||
    fr > 1000 ||
    typeof ip !== "number" ||
    !Number.isFinite(ip) ||
    typeof op !== "number" ||
    !Number.isFinite(op) ||
    op <= ip ||
    typeof w !== "number" ||
    !Number.isFinite(w) ||
    w <= 0 ||
    w > 65536 ||
    typeof h !== "number" ||
    !Number.isFinite(h) ||
    h <= 0 ||
    h > 65536
  )
    throw new Error(
      "The Lottie frame rate, frame range and dimensions must be valid finite numbers",
    );
  const pending: unknown[] = [value];
  while (pending.length) {
    const item = pending.pop();
    if (Array.isArray(item)) for (const entry of item) pending.push(entry);
    else if (isRecord(item)) {
      if (typeof item.x === "string")
        throw new Error("Lottie expressions are not supported; export animation keyframes instead");
      for (const entry of Object.values(item)) {
        if (typeof entry === "number" && !Number.isFinite(entry))
          throw new Error("Animation values must be finite");
        if (typeof entry === "object" && entry !== null) pending.push(entry);
      }
    }
  }
  const warnings = new Set<string>();
  const durationMs = ((op - ip) / fr) * 1000;
  if (!Number.isFinite(durationMs)) throw new Error("Animation duration must be finite");
  if (durationMs > 60000)
    warnings.add("Generated patterns use the first 60 seconds of this animation.");
  const nodes = collectAnimationNodes(value, warnings);
  if (!nodes.some((node) => node.visible))
    warnings.add("No supported visible transform geometry was found for motion analysis.");
  return {
    data: value,
    frameRate: fr,
    inFrame: ip,
    durationMs,
    width: w,
    height: h,
    nodes,
    warnings: [...warnings],
  };
}
