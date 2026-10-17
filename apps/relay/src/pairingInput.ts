import { isPairingCode, isRecord } from "@buzzzz/core";
import { HttpError } from "./security.ts";

export function pairingInput(value: unknown): { code: string; device: string } {
  if (
    !isRecord(value) ||
    !isPairingCode(value.code) ||
    typeof value.device !== "string" ||
    !value.device.trim() ||
    value.device.length > 128
  )
    throw new HttpError(400, "Expected a pairing code and device name");
  return { code: value.code, device: value.device };
}
