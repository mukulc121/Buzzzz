import { sha256 } from "../../crypto";
import type { IRiveConfig } from "@buzzzz/core";
import { DEX_RIVE_CONFIG } from "../project/starter/rive/dex-rive-config";

const DEX_BYTES = 231_444;
const DEX_SHA256 = "a1e7943e8b53816bdeff29cdf91441da5dd2c7fa5fe5f5c150100c12204a0da6";
export async function knownRiveConfig(buffer: ArrayBuffer): Promise<IRiveConfig | undefined> {
  if (buffer.byteLength !== DEX_BYTES) return undefined;
  return (await sha256(buffer)) === DEX_SHA256 ? structuredClone(DEX_RIVE_CONFIG) : undefined;
}
