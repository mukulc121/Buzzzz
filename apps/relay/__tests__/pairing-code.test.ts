import { describe, expect, test } from "bun:test";
import { allocatePairingCode } from "../src/pairingCode.ts";
import { pairingInput } from "../src/pairingInput.ts";

describe("hosted pairing code allocation", () => {
  test("probes collisions in a fixed order and preserves leading zeros", async () => {
    const seen: string[] = [];
    expect(
      await allocatePairingCode(async (code) => {
        seen.push(code);
        return seen.length === 3;
      }, "999999"),
    ).toBe("000001");
    expect(seen).toEqual(["999999", "000000", "000001"]);
  });

  test("bounds allocation work when every candidate is occupied", async () => {
    let attempts = 0;
    await expect(
      allocatePairingCode(async () => {
        attempts += 1;
        return false;
      }, "123456"),
    ).rejects.toMatchObject({ status: 503 });
    expect(attempts).toBe(16);
  });

  test("accepts only a six-digit code and a nonempty bounded device name", () => {
    expect(pairingInput({ code: "000123", device: "Phone" })).toEqual({
      code: "000123",
      device: "Phone",
    });
    for (const value of [
      null,
      { code: 123456, device: "Phone" },
      { code: "12345", device: "Phone" },
      { code: "1234567", device: "Phone" },
      { code: "123456", device: " " },
      { code: "123456", device: "a".repeat(129) },
    ])
      expect(() => pairingInput(value)).toThrow("pairing code");
  });
});
