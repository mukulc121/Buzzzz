import { sha256 } from "../src/crypto";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { afterEach, expect, test } from "bun:test";
import { DEX_RIVE_CONFIG } from "../src/features/project/starter/rive/dex-rive-config";
import { knownRiveConfig } from "../src/features/rive/knownAsset";

const dexPath = new URL(
  "../src/features/project/starter/rive/dexHeadoutIntegration.riv",
  import.meta.url,
);
const originalCrypto = Object.getOwnPropertyDescriptor(globalThis, "crypto");
const bytes = (input: Uint8Array) =>
  input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength) as ArrayBuffer;

afterEach(() => {
  if (originalCrypto) Object.defineProperty(globalThis, "crypto", originalCrypto);
  else Reflect.deleteProperty(globalThis, "crypto");
});

test("the fallback digest matches node for edge lengths", async () => {
  Object.defineProperty(globalThis, "crypto", { value: {}, configurable: true });
  for (const size of [0, 3, 55, 56, 63, 64, 65, 119, 1000]) {
    const input = Uint8Array.from({ length: size }, (_, i) => (i * 37 + 11) & 0xff);
    expect(await sha256(bytes(input))).toBe(createHash("sha256").update(input).digest("hex"));
  }
});

test("only the exact Dex bytes resolve the source config", async () => {
  const dex = bytes(new Uint8Array(await readFile(dexPath)));
  const config = await knownRiveConfig(dex);
  expect(config).toEqual(DEX_RIVE_CONFIG);
  expect(config).not.toBe(DEX_RIVE_CONFIG);
  const changed = new Uint8Array(dex.slice(0));
  changed[changed.length - 1] ^= 1;
  expect(await knownRiveConfig(changed.buffer)).toBeUndefined();
  expect(await knownRiveConfig(dex.slice(1))).toBeUndefined();
});

test("Dex bytes resolve without crypto.subtle on plain-HTTP LAN origins", async () => {
  Object.defineProperty(globalThis, "crypto", { value: {}, configurable: true });
  const dex = bytes(new Uint8Array(await readFile(dexPath)));
  expect(await sha256(dex)).toBe(
    "a1e7943e8b53816bdeff29cdf91441da5dd2c7fa5fe5f5c150100c12204a0da6",
  );
  expect(await knownRiveConfig(dex)).toEqual(DEX_RIVE_CONFIG);
});
