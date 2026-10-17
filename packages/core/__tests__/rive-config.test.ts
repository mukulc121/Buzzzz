import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import {
  emptyPattern,
  isProject,
  isRiveConfig,
  MAX_PATTERN_MS,
  parseMessage,
  type IRiveConfig,
  type Msg,
  type TRiveHapticAction,
} from "../src/index.ts";
import { DEX_RIVE_CONFIG } from "../../../apps/studio/src/features/project/starter/rive/dex-rive-config.ts";

const sequence = {
  kind: "sequence",
  cues: [{ delayMs: 360, preset: "impactSoft" }],
  repeatMs: 1600,
} satisfies TRiveHapticAction;

const legacyProject = {
  presets: [{ id: "p1", name: "Pattern", pattern: emptyPattern() }],
  map: {},
};
const legacyLoad = {
  type: "load",
  riv: "/riv/abc123.riv",
  map: {},
} satisfies Extract<Msg, { type: "load" }>;

describe("declarative Rive haptics", () => {
  test("preserves the source ViewModel, native impacts, phase timings and conditional loop stop", () => {
    expect(DEX_RIVE_CONFIG).toEqual({
      artboard: "artboard",
      viewModel: "ViewModel1",
      nativeSound: false,
      completion: {
        startTrigger: "hapticEntry",
        readyTrigger: "isLoaded",
        readyAfterMs: 2500,
        entryMs: 2200,
        loopPeriodMs: 1600,
        exitMs: 560,
        marginMs: 80,
      },
      haptics: {
        hapticEntry: {
          kind: "sequence",
          cues: [
            { delayMs: 600, preset: "impactSoft" },
            { delayMs: 1800, preset: "impactLight" },
          ],
        },
        hapticLoop: {
          kind: "sequence",
          cues: [
            { delayMs: 0, preset: "impactSoft" },
            { delayMs: 160, preset: "impactSoft" },
            { delayMs: 360, preset: "impactSoft" },
          ],
          repeatMs: 1600,
        },
        hapticLoopStop: { kind: "stop", trigger: "hapticLoop" },
        hapticExit: {
          kind: "sequence",
          immediate: "impactSoft",
          cues: [
            { delayMs: 290, preset: "impactMedium" },
            { delayMs: 430, preset: "impactLight" },
          ],
        },
      },
    });
    expect(isRiveConfig(DEX_RIVE_CONFIG)).toBe(true);
    expect(Object.hasOwn(DEX_RIVE_CONFIG.haptics, "isLoaded")).toBe(false);
  });

  test("the starter uses the exact pinned Rive asset", async () => {
    const asset = await readFile(
      new URL(
        "../../../apps/studio/src/features/project/starter/rive/dexHeadoutIntegration.riv",
        import.meta.url,
      ),
    );
    expect(asset.byteLength).toBe(231444);
    expect(asset.subarray(0, 4).toString()).toBe("RIVE");
    expect(createHash("sha256").update(asset).digest("hex")).toBe(
      "a1e7943e8b53816bdeff29cdf91441da5dd2c7fa5fe5f5c150100c12204a0da6",
    );
  });

  test("old projects and load packets remain valid without configuration", () => {
    expect(isProject(legacyProject)).toBe(true);
    const decoded = parseMessage(JSON.stringify(legacyLoad));
    expect(decoded).toEqual(legacyLoad);
    expect(decoded && Object.hasOwn(decoded, "riveConfig")).toBe(false);
  });

  test("project and relay boundaries preserve a valid source configuration", () => {
    const project = { ...legacyProject, riveConfig: DEX_RIVE_CONFIG };
    const message = { ...legacyLoad, riveConfig: DEX_RIVE_CONFIG };
    expect(isProject(project)).toBe(true);
    expect(parseMessage(JSON.stringify(message))).toEqual(message);
  });

  test("bounds actions, impacts, names and repeat times without rejecting their valid limits", () => {
    const maximalSequence = {
      kind: "sequence",
      cues: Array.from({ length: 64 }, () => ({
        delayMs: MAX_PATTERN_MS,
        preset: "impactSoft",
      })),
      repeatMs: MAX_PATTERN_MS,
    } satisfies TRiveHapticAction;
    const maximal: IRiveConfig = {
      artboard: "a".repeat(512),
      viewModel: "v".repeat(512),
      haptics: Object.fromEntries(
        Array.from({ length: 32 }, (_, index) => [
          index ? `cue${index}` : "c".repeat(512),
          maximalSequence,
        ]),
      ),
    };
    expect(isRiveConfig(maximal)).toBe(true);
    expect(
      isRiveConfig({
        completion: {
          startTrigger: "s".repeat(512),
          readyTrigger: "r".repeat(512),
          readyAfterMs: 0,
          entryMs: MAX_PATTERN_MS,
          loopPeriodMs: MAX_PATTERN_MS,
          exitMs: MAX_PATTERN_MS,
          marginMs: MAX_PATTERN_MS,
        },
      }),
    ).toBe(true);
    expect(
      isRiveConfig({
        completion: { ...DEX_RIVE_CONFIG.completion, readyAfterMs: MAX_PATTERN_MS },
      }),
    ).toBe(true);
    expect(isRiveConfig({})).toBe(true);
    expect(isRiveConfig({ nativeSound: true })).toBe(true);
    expect(isRiveConfig({ nativeSound: false })).toBe(true);
    expect(isRiveConfig({ haptics: {} })).toBe(true);
    expect(
      isRiveConfig({
        haptics: { now: { kind: "sequence", immediate: "impactLight", cues: [] } },
      }),
    ).toBe(true);
    expect(
      isRiveConfig({
        haptics: { finite: { kind: "sequence", cues: [{ delayMs: 0, preset: "impactMedium" }] } },
      }),
    ).toBe(true);
  });

  test.each(
    [
      null,
      [],
      { artboard: "" },
      { artboard: "a".repeat(513) },
      { viewModel: 1 },
      { viewModel: "v".repeat(513) },
      { nativeSound: "false" },
      { nativeSound: 0 },
      { nativeSound: null },
      { script: "arbitrary()" },
      { completion: null },
      { completion: [] },
      { completion: {} },
      { completion: { ...DEX_RIVE_CONFIG.completion, startTrigger: "" } },
      { completion: { ...DEX_RIVE_CONFIG.completion, readyTrigger: "r".repeat(513) } },
      { completion: { ...DEX_RIVE_CONFIG.completion, readyAfterMs: -1 } },
      { completion: { ...DEX_RIVE_CONFIG.completion, readyAfterMs: MAX_PATTERN_MS + 1 } },
      { completion: { ...DEX_RIVE_CONFIG.completion, readyAfterMs: NaN } },
      { completion: { ...DEX_RIVE_CONFIG.completion, entryMs: -1 } },
      { completion: { ...DEX_RIVE_CONFIG.completion, entryMs: "2200" } },
      { completion: { ...DEX_RIVE_CONFIG.completion, loopPeriodMs: 0 } },
      { completion: { ...DEX_RIVE_CONFIG.completion, loopPeriodMs: Infinity } },
      { completion: { ...DEX_RIVE_CONFIG.completion, exitMs: MAX_PATTERN_MS + 1 } },
      { completion: { ...DEX_RIVE_CONFIG.completion, marginMs: -1 } },
      { completion: { ...DEX_RIVE_CONFIG.completion, callback: "arbitrary()" } },
      { haptics: [] },
      { haptics: { "": sequence } },
      { haptics: { ["n".repeat(513)]: sequence } },
      { haptics: Object.fromEntries(Array.from({ length: 33 }, (_, i) => [`cue${i}`, sequence])) },
      { haptics: { invalid: { kind: "script", code: "arbitrary()" } } },
      { haptics: { invalid: { ...sequence, code: "arbitrary()" } } },
      { haptics: { invalid: { kind: "sequence", cues: [] } } },
      { haptics: { invalid: { ...sequence, immediate: "selection" } } },
      { haptics: { invalid: { ...sequence, cues: Array(65).fill(sequence.cues[0]) } } },
      {
        haptics: {
          invalid: { ...sequence, cues: Array(64).fill(sequence.cues[0]), immediate: "impactSoft" },
        },
      },
      { haptics: { invalid: { ...sequence, cues: [{ delayMs: -1, preset: "impactSoft" }] } } },
      { haptics: { invalid: { ...sequence, cues: [{ delayMs: NaN, preset: "impactSoft" }] } } },
      {
        haptics: { invalid: { ...sequence, cues: [{ delayMs: Infinity, preset: "impactSoft" }] } },
      },
      { haptics: { invalid: { ...sequence, cues: [{ delayMs: 60001, preset: "impactSoft" }] } } },
      { haptics: { invalid: { ...sequence, cues: [{ delayMs: 0, preset: "impactHeavy" }] } } },
      {
        haptics: {
          invalid: { ...sequence, cues: [{ delayMs: 0, preset: "impactSoft", code: "x()" }] },
        },
      },
      { haptics: { invalid: { ...sequence, repeatMs: 0 } } },
      { haptics: { invalid: { ...sequence, repeatMs: -1 } } },
      { haptics: { invalid: { ...sequence, repeatMs: 359 } } },
      { haptics: { invalid: { ...sequence, repeatMs: Infinity } } },
      { haptics: { invalid: { ...sequence, repeatMs: 60001 } } },
      { haptics: { invalid: { kind: "stop", trigger: "missing" } } },
      { haptics: { invalid: { kind: "stop", trigger: "invalid" } } },
      { haptics: { loop: sequence, stop: { kind: "stop", trigger: "loop", cues: [] } } },
    ].map((value) => [value]),
  )("rejects malformed configuration at both boundaries %#", (value: unknown) => {
    expect(isRiveConfig(value)).toBe(false);
    expect(isProject({ ...legacyProject, riveConfig: value })).toBe(false);
    expect(parseMessage(JSON.stringify({ ...legacyLoad, riveConfig: value }))).toBeNull();
  });
});
