import { HttpError, randomPairCode } from "./security.ts";

export async function allocatePairingCode(
  reserve: (code: string) => Promise<boolean>,
  start = randomPairCode(),
): Promise<string> {
  for (let attempt = 0; attempt < 16; attempt += 1) {
    const code = String((Number(start) + attempt) % 1_000_000).padStart(6, "0");
    if (await reserve(code)) return code;
  }
  throw new HttpError(503, "Pairing is busy. Try again");
}
