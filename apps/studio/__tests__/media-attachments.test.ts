import { describe, expect, test } from "bun:test";
import { mediaUsage, readRiveFile, sameTrim, storedTrim } from "../src/features/media/attachments";
import { MediaStorageError } from "../src/features/media/model";

const rive = (bytes: number[]) => new Blob([new Uint8Array(bytes)]);

describe("rive validation", () => {
  test("accepts RIVE magic and returns the buffer", async () => {
    const buffer = await readRiveFile(rive([0x52, 0x49, 0x56, 0x45, 7, 0]));
    expect(buffer.byteLength).toBe(6);
  });
  test("rejects wrong magic, short, empty and oversized files", async () => {
    for (const blob of [
      rive([0x50, 0x4b, 3, 4]),
      rive([0x52, 0x49]),
      rive([]),
      new Blob([new Uint8Array(20 * 1024 * 1024 + 1)]),
    ]) {
      const error = await readRiveFile(blob).catch((value: unknown) => value);
      expect(error).toBeInstanceOf(MediaStorageError);
    }
  });
});

describe("stored trim", () => {
  test("default full window stores as null", () => {
    expect(storedTrim({ startMs: 0, endMs: 4200.4 }, 4200.4)).toBeNull();
    expect(storedTrim({ startMs: 0, endMs: 60_000 }, 90_000)).toBeNull();
  });
  test("custom windows are rounded and never empty", () => {
    expect(storedTrim({ startMs: 10.4, endMs: 900.6 }, 4200)).toEqual({ startMs: 10, endMs: 901 });
    expect(storedTrim({ startMs: 5.2, endMs: 5.4 }, 4200)).toEqual({ startMs: 5, endMs: 6 });
  });
  test("compares by value", () => {
    expect(sameTrim(null, null)).toBe(true);
    expect(sameTrim({ startMs: 1, endMs: 2 }, { startMs: 1, endMs: 2 })).toBe(true);
    expect(sameTrim({ startMs: 1, endMs: 2 }, null)).toBe(false);
  });
});

test("usage sums bytes and counts files", () => {
  expect(mediaUsage([{ size: 3 }, { size: 4 }])).toEqual({ files: 2, bytes: 7 });
});
