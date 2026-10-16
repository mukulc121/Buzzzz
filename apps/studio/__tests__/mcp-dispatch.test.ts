import { afterEach, describe, expect, test } from "bun:test";
import { emptyPattern, type Pattern } from "@buzzzz/core";
import { DEFAULT_GENERATION } from "../src/features/audio/generation/options";
import { DEFAULT_ANIMATION_OPTIONS } from "../src/features/animation/generationOptions";
import { fetchRoomAsset, roomAssetUrl } from "../src/features/mcp/asset";
import { parseCommand } from "../src/features/mcp/commands";
import { dispatchCommand } from "../src/features/mcp/dispatch";
import type { ICommandContext, IEditorTarget } from "../src/features/mcp/target";
import { parseAnimationData } from "../src/features/animation/document";
import { analyzeAnimation } from "../src/features/animation/analysis";
import animationReference from "./fixtures/animation-reference.json";

const sampleRate = 24000;
const decoded = {
  sampleRate,
  durationMs: 2000,
  channels: [
    Float32Array.from({ length: 2 * sampleRate }, (_, index) => {
      const local = index % (sampleRate / 4);
      return 0.3 * Math.sin(index / 20) + (local < 200 ? 0.5 * Math.exp(-local / 30) : 0);
    }),
  ],
};
const pattern = (): Pattern => ({
  ...emptyPattern(),
  discretePattern: [{ time: 10, amplitude: 1, frequency: 0.5 }],
});

function editor(overrides: Partial<IEditorTarget> = {}) {
  const log: string[] = [];
  const state = {
    range: null as { start: number; end: number } | null,
    playhead: null as number | null,
  };
  const base: IEditorTarget = {
    document: {
      isWriter: true,
      pattern: pattern(),
      canUndo: true,
      canRedo: false,
      undo: () => (log.push("undo"), true),
      redo: () => false,
    },
    composer: {
      selection: [],
      setSelected: (point) => void log.push(`selected:${point?.index ?? "none"}`),
      setSelection: (points) => void log.push(`selection:${points.length}`),
      get range() {
        return state.range;
      },
      setRange: (range) => void (state.range = range),
    },
    playback: {
      playhead: null,
      setPlayhead: (value) => void (state.playhead = typeof value === "number" ? value : null),
      playing: false,
    },
    audio: {
      source: null,
      decoding: false,
      trim: { startMs: 0, endMs: 0 },
      setTrim: (start, end) => void log.push(`trim:${start}-${end}`),
      metrics: { frameMs: 20, params: {} },
      generation: { options: DEFAULT_GENERATION, strategyParams: {} },
    },
    animation: {
      source: null,
      loading: false,
      analysis: null,
      frameMs: 1000 / 240,
      generationOptions: DEFAULT_ANIMATION_OPTIONS,
      hybrid: { gain: 1.2, threshold: 0.17, minGapMs: 70, freqFollow: 0.7 },
      strategyParams: {},
      setSeekMs: (time) => void log.push(`seek:${time}`),
    },
    media: {
      ready: true,
      pending: {},
      importFile: async (file, kind) => (
        log.push(`import:${kind}:${file.name}:${file.size}`),
        true
      ),
      detach: async () => null,
      library: { attachment: {} },
    },
    applyGenerated: () => void log.push("apply"),
    preserve: (_pattern, name) => void log.push(`add:${name}`),
    ...overrides,
  };
  return { target: base, log, state };
}
const context = (
  target: IEditorTarget,
  loadAsset?: ICommandContext["loadAsset"],
): ICommandContext => ({
  read: () => target,
  signal: new AbortController().signal,
  loadAsset: loadAsset ?? (async () => new Blob(["x"])),
});

describe("parseCommand mirrors the relay schemas", () => {
  test("rejects unknown keys, bad ranges and invalid layers", () => {
    expect(() => parseCommand("audio_analyze", { frameMs: 1 })).toThrow("2 to 100");
    expect(() => parseCommand("editor_cursor", { timeMs: 10, extra: 1 })).toThrow("not supported");
    expect(() =>
      parseCommand("editor_selection", { action: "set", points: [{ layer: "x", index: 0 }] }),
    ).toThrow("layer");
    expect(() => parseCommand("media_trim", { offsetMs: 0 })).toThrow("durationMs is required");
    expect(parseCommand("audio_generate", {})).toEqual({
      command: "audio_generate",
      approach: undefined,
      options: {},
      action: "apply",
    });
  });
});

describe("dispatchCommand", () => {
  test("animation tools use the real channel gains, detents and motion metrics", async () => {
    const source = animationReference.scenarios.find(
      (scenario) => scenario.name === "spin / defaults",
    );
    if (!source) throw new Error("Missing spin fixture");
    const document = parseAnimationData(source.source);
    const { target } = editor();
    const applied: Pattern[] = [];
    target.applyGenerated = (pattern) => {
      applied.push(pattern);
    };
    target.animation.source = {
      file: new File([JSON.stringify(source.source)], "spin.json"),
      url: "blob:animation",
      durationMs: document.durationMs,
      data: document.data,
      document,
      animationId: "spin",
      animations: [{ id: "spin", document }],
      assetUrls: [],
    };
    target.animation.analysis = analyzeAnimation(document);
    const result = await dispatchCommand(
      "animation_generate",
      {
        approach: "channel",
        options: { detentsPerTurn: 0, rotationToIntensity: 0, rotationToFreq: 0 },
      },
      context(target),
    );
    expect(result).toMatchObject({ approach: "channel", eventCount: 0 });
    expect(applied[0].continuousPattern.amplitude.every((point) => point.value === 0)).toBe(true);
    expect(applied[0].continuousPattern.frequency.every((point) => point.value === 0.3)).toBe(true);
    await expect(
      dispatchCommand(
        "animation_generate",
        { approach: "channel", options: { intensityChannel: "energy" } },
        context(target),
      ),
    ).rejects.toThrow("not a generation setting");
    await expect(
      dispatchCommand(
        "animation_generate",
        { approach: "channel", options: { detentsPerTurn: 25 } },
        context(target),
      ),
    ).rejects.toThrow("0 to 24");
    const report = await dispatchCommand("animation_analyze", {}, context(target));
    expect(report).toMatchObject({
      smoothingMs: 12,
      frames: 481,
      metrics: { rotationRate: { max: 1 }, transient: { max: 1 } },
    });
  });
  test("selection checks points against the current pattern", async () => {
    const { target, log } = editor();
    await expect(
      dispatchCommand(
        "editor_selection",
        { action: "set", points: [{ layer: "discrete", index: 3 }] },
        context(target),
      ),
    ).rejects.toThrow("no discrete point 3");
    const result = await dispatchCommand(
      "editor_selection",
      { action: "set", points: [{ layer: "discrete", index: 0 }] },
      context(target),
    );
    expect(result).toEqual({ points: [{ layer: "discrete", index: 0 }] });
    expect(log).toEqual(["selected:0", "selection:1"]);
  });

  test("range merges partial updates and rejects empty ranges", async () => {
    const { target, state } = editor();
    expect(
      await dispatchCommand("editor_range", { startMs: 5, endMs: 50 }, context(target)),
    ).toEqual({
      enabled: true,
      startMs: 5,
      endMs: 50,
    });
    await expect(dispatchCommand("editor_range", { endMs: 2 }, context(target))).rejects.toThrow(
      "greater",
    );
    await dispatchCommand("editor_range", { enabled: false }, context(target));
    expect(state.range).toBeNull();
  });

  test("cursor moves playhead and animation together, never during playback", async () => {
    const { target, log, state } = editor();
    await dispatchCommand("editor_cursor", { timeMs: 120 }, context(target));
    expect(state.playhead).toBe(120);
    expect(log).toContain("seek:120");
    const playing = editor({ playback: { ...target.playback, playing: true } });
    await expect(
      dispatchCommand("editor_cursor", { timeMs: 5 }, context(playing.target)),
    ).rejects.toThrow("Stop playback");
  });

  test("mutating commands refuse a read-only window", async () => {
    const { target } = editor();
    const reader = { ...target, document: { ...target.document, isWriter: false } };
    for (const [command, args] of [
      ["editor_history", { action: "undo" }],
      ["media_detach", { kind: "audio" }],
      ["audio_generate", {}],
    ] as const)
      await expect(dispatchCommand(command, args, context(reader))).rejects.toThrow("read-only");
    expect(await dispatchCommand("editor_history", { action: "undo" }, context(target))).toEqual({
      action: "undo",
      applied: true,
    });
  });

  test("audio commands report missing or loading audio explicitly", async () => {
    const { target } = editor();
    await expect(dispatchCommand("audio_analyze", {}, context(target))).rejects.toThrow(
      "media_attach",
    );
    const loading = { ...target, audio: { ...target.audio, decoding: true } };
    await expect(dispatchCommand("audio_analyze", {}, context(loading))).rejects.toThrow(
      "still loading",
    );
  });

  test("audio_generate applies or adds the chosen Pulsar approach", async () => {
    const file = new File(["x"], "beat.wav");
    const source = { file, url: "blob:x", durationMs: 2000, decoded };
    const { target, log } = editor();
    const ready = {
      ...target,
      audio: { ...target.audio, source, trim: { startMs: 0, endMs: 2000 } },
    };
    const applied = await dispatchCommand(
      "audio_generate",
      { approach: "transient-taps", options: { stampDecayMs: 60, contrast: 0.5 } },
      context(ready),
    );
    expect(applied).toMatchObject({ action: "apply", approach: "transient-taps" });
    await dispatchCommand(
      "audio_generate",
      { approach: "rms-envelope", action: "add" },
      context(ready),
    );
    expect(log).toEqual(["apply", "add:RMS envelope"]);
    await expect(
      dispatchCommand("audio_generate", { approach: "nope" }, context(ready)),
    ).rejects.toThrow("Unknown audio approach");
    await expect(
      dispatchCommand("audio_generate", { options: { contrast: "loud" } }, context(ready)),
    ).rejects.toThrow("finite number");
    await expect(
      dispatchCommand("audio_generate", { options: { intensity: 1 } }, context(ready)),
    ).rejects.toThrow("not a generation setting");
  });

  test("audio_analyze reports Pulsar metrics with the panel's parameters", async () => {
    const file = new File(["x"], "beat.wav");
    const source = { file, url: "blob:x", durationMs: 2000, decoded };
    const { target } = editor();
    const ready = {
      ...target,
      audio: {
        ...target.audio,
        source,
        trim: { startMs: 0, endMs: 1000 },
        metrics: { frameMs: 20, params: { band: { lowHz: 100, highHz: 400 } } },
      },
    };
    const result = await dispatchCommand(
      "audio_analyze",
      { metrics: ["band", "sharpness"] },
      context(ready),
    );
    expect(Object.keys((result as { metrics: object }).metrics)).toEqual(["band", "sharpness"]);
    expect(result).toMatchObject({ frameMs: 20, durationMs: 1000 });
    await expect(
      dispatchCommand("audio_analyze", { metrics: ["rms"] }, context(ready)),
    ).rejects.toThrow("Unknown audio metric");
  });

  test("media_trim reports the clamped window it applied", async () => {
    const file = new File(["x"], "beat.wav");
    const source = { file, url: "blob:x", durationMs: 2000, decoded };
    const { target, log } = editor();
    const ready = { ...target, audio: { ...target.audio, source } };
    expect(
      await dispatchCommand("media_trim", { offsetMs: 1500, durationMs: 9000 }, context(ready)),
    ).toEqual({
      offsetMs: 1500,
      durationMs: 500,
      sourceDurationMs: 2000,
    });
    expect(log).toEqual(["trim:1500-2000"]);
  });

  test("media_attach persists the fetched asset through importFile", async () => {
    const { target, log } = editor();
    const blob = new Blob(["{}"], { type: "application/json" });
    const result = await dispatchCommand(
      "media_attach",
      { kind: "animation", assetUrl: "https://relay.example/a", filename: "../wave.json" },
      context(target, async () => blob),
    );
    expect(result).toEqual({
      attached: true,
      kind: "animation",
      filename: ".._wave.json",
      bytes: 2,
    });
    expect(log).toEqual(["import:animation:.._wave.json:2"]);
  });
});

describe("roomAssetUrl", () => {
  const room = "a".repeat(32);
  const asset = `https://relay.example/v1/rooms/${room}/assets/${"b".repeat(32)}.bin?token=${"c".repeat(43)}`;
  test("accepts only signed assets of this room on the relay origin", () => {
    expect(roomAssetUrl(asset, "https://relay.example", room).href).toBe(asset);
    for (const input of [
      asset.replace("relay.example", "evil.example"),
      asset.replace(room, "d".repeat(32)),
      asset.replace("https://", "https://user:pass@"),
      `${asset}#x`,
      asset.replace(/token=.*/, "token=short"),
      `${asset}&extra=1`,
      "not a url",
    ])
      expect(() => roomAssetUrl(input, "https://relay.example", room)).toThrow();
  });
});

describe("fetchRoomAsset", () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
  });
  const serve = (type: string, headers: Record<string, string> = {}) => {
    const seen: RequestInit[] = [];
    globalThis.fetch = Object.assign(
      async (_url: string | URL | Request, init?: RequestInit) => {
        if (init) seen.push(init);
        return new Response("{}", { headers: { "Content-Type": type, ...headers } });
      },
      { preconnect: realFetch.preconnect },
    );
    return seen;
  };
  const load = (kind: "audio" | "animation") =>
    fetchRoomAsset({ url: "https://relay.example/a", kind, signal: new AbortController().signal });

  test("sends no ambient credentials and accepts Lottie JSON or dotLottie", async () => {
    const seen = serve("application/json");
    expect((await load("animation")).size).toBe(2);
    expect(seen[0]).toMatchObject({
      credentials: "omit",
      redirect: "error",
      referrerPolicy: "no-referrer",
    });
    serve("application/zip+dotlottie");
    expect((await load("animation")).type).toBe("application/zip+dotlottie");
  });

  test("rejects generic zip, mismatched kinds and oversized assets", async () => {
    serve("application/zip");
    await expect(load("animation")).rejects.toThrow("not animation media");
    serve("application/json");
    await expect(load("audio")).rejects.toThrow("not audio media");
    serve("audio/wav", { "Content-Length": String(21 * 1024 * 1024) });
    await expect(load("audio")).rejects.toThrow("20 MiB");
  });
});
