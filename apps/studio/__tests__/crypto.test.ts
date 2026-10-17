import { createHash } from "node:crypto";
import { afterEach, expect, test } from "bun:test";
import { randomUUID, sha256 } from "../src/crypto";

const originalCrypto = Object.getOwnPropertyDescriptor(globalThis, "crypto");
const nativeUUID = globalThis.crypto.randomUUID.bind(globalThis.crypto);
const nativeEntropy = globalThis.crypto.getRandomValues.bind(globalThis.crypto);
const nativeDigest = globalThis.crypto.subtle.digest.bind(globalThis.crypto.subtle);

afterEach(() => {
  if (originalCrypto) Object.defineProperty(globalThis, "crypto", originalCrypto);
  else Reflect.deleteProperty(globalThis, "crypto");
});

function useCrypto(value: object) {
  Object.defineProperty(globalThis, "crypto", { value, configurable: true });
}

test("UUIDs prefer the browser's native implementation", () => {
  let calls = 0;
  useCrypto({
    randomUUID() {
      calls++;
      return nativeUUID();
    },
  });
  expect(randomUUID()).toMatch(/^[a-f0-9-]{36}$/);
  expect(calls).toBe(1);
});

test("plain-HTTP UUIDs use cryptographic entropy and RFC 4122 version and variant bits", () => {
  let calls = 0;
  useCrypto({
    getRandomValues(bytes: Uint8Array) {
      calls++;
      return nativeEntropy(bytes);
    },
  });
  const identifiers = Array.from({ length: 100 }, () => randomUUID());
  expect(new Set(identifiers).size).toBe(identifiers.length);
  for (const id of identifiers)
    expect(id).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
  expect(calls).toBe(identifiers.length);
});

test("SHA-256 prefers Web Crypto when it is available", async () => {
  let calls = 0;
  useCrypto({
    subtle: {
      digest(...args: Parameters<typeof nativeDigest>) {
        calls++;
        return nativeDigest(...args);
      },
    },
  });
  expect(await sha256(new TextEncoder().encode("abc").buffer)).toBe(
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  );
  expect(calls).toBe(1);
});

test("plain-HTTP SHA-256 matches published standard vectors", async () => {
  useCrypto({});
  const vectors = [
    ["", "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"],
    ["abc", "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"],
    [
      "abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq",
      "248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1",
    ],
    ["a".repeat(1_000_000), "cdc76e5c9914fb9281a1c7e284d73e67f1809a48a497200e046d39ccc7112cd0"],
  ];
  for (const [input, expected] of vectors)
    expect(await sha256(new TextEncoder().encode(input).buffer)).toBe(expected);
});

test("plain-HTTP SHA-256 matches node across padding and block boundaries", async () => {
  useCrypto({});
  for (const size of [0, 1, 3, 55, 56, 57, 63, 64, 65, 119, 120, 127, 128, 129, 1000, 65_536]) {
    const input = Uint8Array.from({ length: size }, (_, i) => (i * 37 + 11) & 0xff);
    expect(await sha256(input.buffer)).toBe(createHash("sha256").update(input).digest("hex"));
  }
});
