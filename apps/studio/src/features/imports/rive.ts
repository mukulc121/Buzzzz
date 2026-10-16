import { isRecord } from "@buzzzz/core";
import { MAX_MEMBER_BYTES } from "./archive";
import type { IRiveAsset } from "./model";
import { isRive } from "./signatures";

export function validateRive(riv: IRiveAsset) {
  if (
    !riv.name ||
    riv.name.length > 512 ||
    riv.buffer.byteLength > MAX_MEMBER_BYTES ||
    !isRive(new Uint8Array(riv.buffer))
  )
    throw new Error("Invalid Rive attachment");
}
export function readRiveAttachment(value: unknown): {
  riv: IRiveAsset | null;
  stateMachine?: string;
} {
  if (value == null) return { riv: null };
  if (
    !isRecord(value) ||
    typeof value.name !== "string" ||
    typeof value.data !== "string" ||
    value.data.length > Math.ceil(MAX_MEMBER_BYTES / 3) * 4 + 4 ||
    (value.stateMachine !== undefined &&
      (typeof value.stateMachine !== "string" || value.stateMachine.length > 512))
  )
    throw new Error("Invalid Rive attachment");
  try {
    const riv = {
      name: value.name,
      buffer: Uint8Array.from(atob(value.data), (character) => character.charCodeAt(0)).buffer,
    };
    validateRive(riv);
    return { riv, stateMachine: value.stateMachine };
  } catch {
    throw new Error("Invalid Rive attachment");
  }
}
