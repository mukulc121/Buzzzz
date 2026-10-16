import { describe, expect, test } from "bun:test";
import { MEDIA_LIMITS } from "../src/features/media/model";
import {
  checkMediaLimits,
  downloadName,
  isMediaAttachment,
  normalizeName,
  normalizeTrim,
  scopeFor,
  toMediaError,
} from "../src/features/media/rules";

const MiB = 1024 * 1024;

describe("media limits", () => {
  test("rejects empty and oversized files", () => {
    expect(checkMediaLimits(0, [])?.code).toBe("invalid");
    expect(checkMediaLimits(20 * MiB + 1, [])?.code).toBe("limit");
    expect(checkMediaLimits(20 * MiB, [])).toBeNull();
  });
  test("caps file count and total project bytes", () => {
    const ten = Array.from({ length: 10 }, () => ({ size: 1 }));
    expect(checkMediaLimits(1, ten)?.code).toBe("limit");
    const full = Array.from({ length: 5 }, () => ({ size: 20 * MiB }));
    expect(checkMediaLimits(1, full)?.code).toBe("limit");
    expect(checkMediaLimits(1, full.slice(1))).toBeNull();
  });
});

describe("trim", () => {
  test("keeps a valid window and rounds it", () => {
    expect(normalizeTrim({ startMs: 10.4, endMs: 60010.4 })).toEqual({ startMs: 10, endMs: 60010 });
  });
  test("rejects reversed, negative, non-finite and over-long windows", () => {
    for (const trim of [
      { startMs: 5, endMs: 5 },
      { startMs: -1, endMs: 10 },
      { startMs: 0, endMs: Number.NaN },
      { startMs: 0, endMs: MEDIA_LIMITS.trimMs + 1 },
    ])
      expect(() => normalizeTrim(trim)).toThrow();
  });
});

test("rive attaches project-wide, other media per pattern", () => {
  expect(scopeFor("rive", "a")).toBe(scopeFor("rive", "b"));
  expect(scopeFor("audio", "a")).not.toBe(scopeFor("audio", "b"));
});

test("names are trimmed and download names keep the original extension", () => {
  expect(() => normalizeName("   ")).toThrow();
  expect(normalizeName("x".repeat(500))).toHaveLength(MEDIA_LIMITS.nameLength);
  expect(downloadName({ name: "Kick", originalName: "kick.wav" })).toBe("Kick.wav");
  expect(downloadName({ name: "Kick.WAV", originalName: "kick.wav" })).toBe("Kick.WAV");
  expect(downloadName({ name: "Loop", originalName: "loop" })).toBe("Loop");
});

test("storage failures map to explicit codes", () => {
  expect(toMediaError(new DOMException("full", "QuotaExceededError")).code).toBe("quota");
  expect(toMediaError(new DOMException("gone", "NotFoundError")).code).toBe("missing");
  expect(toMediaError(new Error("boom")).code).toBe("unavailable");
});

test("rejects malformed attachment records read back from storage", () => {
  const base = { projectId: "p", scope: "s", kind: "audio", assetId: "m", trim: null };
  expect(isMediaAttachment(base)).toBe(true);
  expect(isMediaAttachment({ ...base, kind: "video" })).toBe(false);
  expect(isMediaAttachment({ ...base, trim: { startMs: "0" } })).toBe(false);
});
