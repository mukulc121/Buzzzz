import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import type { Pattern } from "@buzzzz/core";

interface IPreset {
  name: string;
  pattern: Pattern;
}
interface IBlock {
  frame: number;
  samples: number[];
}
interface IRun {
  samples: number[];
  rendered: number[];
  sampleRate: number;
  messages: string[];
  playheads: number[];
  starts: number[];
  phonePatterns: Pattern[];
  error?: string;
}
interface IOptions {
  mode?: "document" | "pattern";
  sound?: boolean;
  onPhone?: boolean;
  range?: { start: number; end: number };
  loop?: boolean;
  stopAtMs?: number;
  soundOnAfterStart?: boolean;
  cursor?: number;
}

const presets: IPreset[] = JSON.parse(
  readFileSync(
    new URL("../../packages/core/src/presets/pulsar-presets.json", import.meta.url),
    "utf8",
  ),
);
const afterglow = presets.find((preset) => preset.name === "Afterglow")!.pattern;

// Routes the real destination through a worklet that copies every rendered block.
const recorder = () => {
  const source = `registerProcessor("recorder", class extends AudioWorkletProcessor {
    process(inputs, outputs) {
      const input = inputs[0]?.[0];
      if (input) outputs[0][0].set(input);
      this.port.postMessage({ frame: currentFrame, samples: input ? Array.from(input) : [] });
      return true;
    }
  });`;
  const url = URL.createObjectURL(new Blob([source], { type: "application/javascript" }));
  const Native = window.AudioContext;
  const blocks: IBlock[] = [];
  const state = window as unknown as {
    __blocks: IBlock[];
    __sampleRate: number;
    __recording?: boolean;
  };
  state.__blocks = blocks;
  // Reports suspended until the recorder is attached, so first play always takes the resume path.
  class Recorded extends Native {
    tap: GainNode;
    ready: Promise<void>;
    attached = false;
    constructor(options?: AudioContextOptions) {
      super(options);
      // Only the first context records, so another module instance can't interleave blocks.
      const recording = !state.__recording;
      state.__recording = true;
      state.__sampleRate = this.sampleRate;
      this.tap = this.createGain();
      this.ready = this.audioWorklet.addModule(url).then(() => {
        const node = new AudioWorkletNode(this, "recorder");
        if (recording) node.port.onmessage = (event) => blocks.push(event.data);
        connect.call(this.tap, node);
        connect.call(node, this.destination);
        this.attached = true;
      });
    }
    override get state() {
      return this.attached ? super.state : "suspended";
    }
    override async resume() {
      await this.ready;
      return super.resume();
    }
  }
  const connect = AudioNode.prototype.connect as (target: AudioNode) => AudioNode;
  AudioNode.prototype.connect = function (this: AudioNode, target: AudioNode | AudioParam) {
    const context = this.context as Recorded;
    if (target instanceof AudioDestinationNode && context.tap && this !== context.tap)
      return connect.call(this, context.tap);
    return (connect as (t: AudioNode | AudioParam) => AudioNode).call(this, target);
  } as typeof AudioNode.prototype.connect;
  window.AudioContext = Recorded;
};

const harness = `
import * as ReactModule from "/node_modules/.vite/deps/react.js";
import * as DOMModule from "/node_modules/.vite/deps/react-dom_client.js";
import { usePlayback } from "/src/features/composer/usePlayback.ts";
import { useComposer } from "/src/features/composer/useComposer.ts";
const React = ReactModule.default ?? ReactModule;
const { createRoot } = DOMModule.default ?? DOMModule;
const log = { messages: [], playheads: [], starts: [], phonePatterns: [], editorChanges: 0, done: false };
window.__playback = log;
function Harness() {
  const [instance, setInstance] = React.useState("project-a/preset-a");
  const composer = useComposer({ continuousPattern: { amplitude: [], frequency: [] }, discretePattern: [] }, { durationMs: 500, markers: [], range: null }, () => log.editorChanges++, instance);
  const playback = usePlayback({
    send: (message) => { log.messages.push(message.type); if (message.type === "play") log.phonePatterns.push(message.pattern); },
    phones: 1,
    cursor: composer.cursor,
    onCursorChange: composer.setCursor,
    onStart: (time) => log.starts.push(time),
    onError: (message) => (log.error = message),
  });
  React.useEffect(() => {
    if (playback.playhead !== null) log.playheads.push(playback.playhead);
  }, [playback.playhead]);
  React.useEffect(() => {
    if (!playback.playing) log.done = true;
  }, [playback.playing]);
  const second = usePlayback({ send: () => {}, phones: 0 });
  window.__controls = playback;
  window.__second = second;
  window.__composer = composer;
  window.__setInstance = setInstance;
  return React.createElement("output", { id: "playing" }, String(playback.playing));
}
const container = document.createElement("div");
document.getElementById("root").style.display = "none";
document.body.append(container);
createRoot(container).render(React.createElement(Harness));
`;

async function mount(page: Page) {
  await page.addInitScript(recorder);
  const entry = await (await page.request.get("/src/main.tsx")).text();
  const react = entry.match(/from "([^"]*\/react\.js\?[^"]*)"/)?.[1];
  const dom = entry.match(/from "([^"]*\/react-dom_client\.js\?[^"]*)"/)?.[1];
  if (!react || !dom) throw new Error("Missing Vite React modules");
  await page.route(/\/src\/main\.tsx(?:\?.*)?$/, (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: harness
        .replace("/node_modules/.vite/deps/react.js", react)
        .replace("/node_modules/.vite/deps/react-dom_client.js", dom),
    }),
  );
  await page.goto("/");
  await expect(page.locator("#playing")).toHaveText("false");
}

async function play(page: Page, pattern: Pattern, options: IOptions = {}): Promise<IRun> {
  return page.evaluate(
    async ({ pattern, options }) => {
      const state = window as unknown as {
        __controls: {
          play: (pattern: Pattern, range?: unknown, mode?: string) => void;
          stop: () => void;
          setLoop: (loop: boolean) => void;
          setSound: (sound: boolean) => void;
          setOnPhone: (onPhone: boolean) => void;
          setPlayhead: (time: number) => void;
        };
        __playback: {
          messages: string[];
          playheads: number[];
          starts: number[];
          phonePatterns: Pattern[];
          done: boolean;
          error?: string;
        };
        __blocks: IBlock[];
        __sampleRate: number;
      };
      const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
      const until = async (done: () => boolean) => {
        for (const started = performance.now(); !done() && performance.now() - started < 5000;)
          await wait(10);
      };
      const controls = state.__controls;
      controls.setLoop(Boolean(options.loop));
      controls.setSound(options.sound ?? true);
      controls.setOnPhone(options.onPhone ?? true);
      controls.setPlayhead(options.cursor ?? 0);
      await wait(50);
      state.__blocks.length = 0;
      Object.assign(state.__playback, {
        messages: [],
        playheads: [],
        starts: [],
        phonePatterns: [],
        done: false,
      });
      state.__controls.play(pattern, options.range, options.mode ?? "pattern");
      if (options.soundOnAfterStart) controls.setSound(true);
      await until(() => state.__playback.playheads.length > 0);
      if (options.stopAtMs !== undefined) {
        // The playhead follows the audio clock, so this stops at an audible position.
        await until(() => Math.max(...state.__playback.playheads) >= options.stopAtMs!);
        controls.stop();
      }
      if (options.loop) {
        const restarts = () =>
          state.__playback.playheads.filter((time, index, all) => time < (all[index - 1] ?? 0))
            .length;
        await until(() => restarts() >= 3);
        controls.stop();
      }
      await until(() => state.__playback.done);
      await wait(150);
      // Reference render on its own offline context, sized like Pulsar's buffer.
      const modulePath = "/src/features/composer/soundGraph.ts";
      const { schedulePatternSound, soundDuration } = await import(modulePath);
      const reference = new OfflineAudioContext(
        1,
        Math.floor((soundDuration(pattern) + 0.1) * state.__sampleRate),
        state.__sampleRate,
      );
      schedulePatternSound(reference, pattern, 0);
      const rendered = await reference.startRendering();
      return {
        samples: state.__blocks.flatMap((block) => block.samples),
        rendered: Array.from(rendered.getChannelData(0)),
        sampleRate: state.__sampleRate,
        messages: state.__playback.messages,
        playheads: state.__playback.playheads,
        starts: state.__playback.starts,
        phonePatterns: state.__playback.phonePatterns,
        error: state.__playback.error,
      };
    },
    { pattern, options },
  );
}

// Groups audible samples into bursts separated by at least 10ms of silence.
function bursts(samples: number[], sampleRate: number) {
  const gap = 0.01 * sampleRate;
  const found: { start: number; end: number; peak: number }[] = [];
  let silent = Infinity;
  for (const [index, value] of samples.entries()) {
    if (Math.abs(value) < 1e-3) {
      silent++;
      continue;
    }
    const last = found.at(-1);
    if (last && silent < gap) {
      last.end = index;
      last.peak = Math.max(last.peak, Math.abs(value));
    } else found.push({ start: index, end: index, peak: Math.abs(value) });
    silent = 0;
  }
  const origin = found[0]?.start ?? 0;
  return found.map((burst) => ({
    start: ((burst.start - origin) / sampleRate) * 1000,
    length: ((burst.end - burst.start) / sampleRate) * 1000,
    peak: burst.peak,
  }));
}

// Live output from its first non-zero sample must equal the offline render sample for sample.
function expectSameSound(run: IRun, label: string) {
  const first = (values: number[]) => values.findIndex((value) => value !== 0);
  const live = run.samples.slice(first(run.samples));
  const rendered = run.rendered.slice(first(run.rendered));
  let worst = 0;
  for (const [index, value] of rendered.entries())
    worst = Math.max(worst, Math.abs((live[index] ?? 0) - value));
  expect(worst, label).toBeLessThan(1e-6);
}

test("Afterglow plays Pulsar's exact sound with all three bursts through the playback hook", async ({
  page,
}) => {
  await mount(page);
  // The first play goes through a suspended AudioContext.
  const run = await play(page, afterglow);
  const heard = bursts(run.samples, run.sampleRate);
  expect(heard).toHaveLength(3);
  for (const [index, time] of [0, 75, 150].entries())
    expect(Math.abs(heard[index]!.start - time)).toBeLessThan(1);
  expect(heard[2]!.length).toBeGreaterThan(18);
  expectSameSound(run, "Afterglow");
  expect(run.messages).toEqual(["play"]);
  expect(Math.max(...run.playheads)).toBeLessThanOrEqual(150);
});

test("presets ending on a tap play that tap in full and match the render", async ({ page }) => {
  await mount(page);
  const ending = presets.filter(({ pattern }) => {
    const lastTap = Math.max(...pattern.discretePattern.map((tap) => tap.time));
    const lastCurve = Math.max(0, ...pattern.continuousPattern.amplitude.map((p) => p.time));
    return pattern.discretePattern.length && lastTap >= lastCurve && lastTap < 1500;
  });
  expect(ending.length).toBeGreaterThan(0);
  for (const preset of ending.slice(0, 6)) {
    const run = await play(page, preset.pattern);
    expectSameSound(run, preset.name);
    expect(run.messages, preset.name).toEqual(["play"]);
  }
});

test("explicit stop silences sound and the phone immediately", async ({ page }) => {
  await mount(page);
  const run = await play(page, afterglow, { stopAtMs: 40 });
  expect(bursts(run.samples, run.sampleRate)).toHaveLength(1);
  expect(run.messages).toEqual(["play", "stop"]);
});

test("loop restarts at the range end, clipping the tail without overlapping passes", async ({
  page,
}) => {
  await mount(page);
  const run = await play(page, afterglow, { loop: true });
  const nonZero = (values: number[], from = 0) =>
    values.findIndex((value, index) => index >= from && value !== 0);
  const first = nonZero(run.rendered);
  const lastTap = nonZero(run.rendered, Math.round(0.15 * run.sampleRate)) - first;
  let cursor = nonZero(run.samples);
  for (let index = 0; index < 3; index++) {
    // Each pass is the render until it's cut, then silence until the next pass starts.
    let matched = 0;
    while (
      first + matched < run.rendered.length &&
      Math.abs(run.samples[cursor + matched]! - run.rendered[first + matched]!) < 1e-6
    )
      matched++;
    expect(matched, `pass ${index}`).toBeGreaterThan(lastTap);
    const next = nonZero(run.samples, cursor + matched);
    // Waiting for the 173ms tail plus the 30ms start lead would space passes 203ms or more.
    expect(((next - cursor) / run.sampleRate) * 1000, `pass ${index} spacing`).toBeLessThan(203);
    for (let sample = cursor + matched; sample < next; sample++)
      expect(run.samples[sample], `pass ${index} silence`).toBe(0);
    cursor = next;
  }
});

test("a trimmed range end excludes a tap on it while the full length keeps it", async ({
  page,
}) => {
  await mount(page);
  const count = async (range?: { start: number; end: number }) => {
    const run = await play(page, afterglow, { range });
    return bursts(run.samples, run.sampleRate).length;
  };
  expect(await count({ start: 0, end: 75 })).toBe(1);
  expect(await count({ start: 0, end: 150 })).toBe(3);
  expect(await count({ start: 75, end: 150 })).toBe(2);
  expect(await count()).toBe(3);
});

test("sound switched on while the buffer renders still plays", async ({ page }) => {
  await mount(page);
  const run = await play(page, afterglow, {
    mode: "document",
    sound: false,
    soundOnAfterStart: true,
  });
  expect(bursts(run.samples, run.sampleRate).length).toBeGreaterThanOrEqual(2);
});

test("editor Play starts strictly inside the range and returns to the scrub cursor", async ({
  page,
}) => {
  await mount(page);
  for (const [cursor, start, count] of [
    [0, 25, 2],
    [25, 25, 2],
    [75, 75, 2],
    [100, 100, 1],
    [150, 25, 2],
    [200, 25, 2],
  ]) {
    const run = await play(page, afterglow, {
      cursor,
      range: { start: 25, end: 150 },
      mode: "document",
    });
    expect(run.starts, `cursor ${cursor}`).toEqual([start]);
    expect(bursts(run.samples, run.sampleRate), `cursor ${cursor}`).toHaveLength(count);
    expect(run.phonePatterns[0]!.discretePattern.map((tap) => tap.time)).toEqual(
      afterglow.discretePattern.filter((tap) => tap.time >= start).map((tap) => tap.time - start),
    );
    expect(
      await page.evaluate(
        () => (window as unknown as { __controls: { playhead: number } }).__controls.playhead,
      ),
    ).toBe(cursor);
  }
  const full = await play(page, afterglow, { cursor: 75, mode: "document" });
  expect(full.starts).toEqual([75]);
  expect(bursts(full.samples, full.sampleRate)).toHaveLength(2);
});

test("a cursor shortens only the first loop pass, then repeats from the range start", async ({
  page,
}) => {
  await mount(page);
  const run = await play(page, afterglow, {
    cursor: 75,
    range: { start: 25, end: 140 },
    mode: "document",
    loop: true,
  });
  expect(run.starts.slice(0, 4)).toEqual([75, 25, 25, 25]);
  expect(
    run.phonePatterns.slice(0, 4).map((pattern) => pattern.discretePattern.map((tap) => tap.time)),
  ).toEqual([[0], [50], [50], [50]]);
  const heard = bursts(run.samples, run.sampleRate);
  expect(heard.length).toBeGreaterThanOrEqual(3);
  for (const burst of heard) expect(burst.length).toBeGreaterThan(18);
  expect(heard[1]!.start).toBeGreaterThan(100);
  expect(heard[1]!.start).toBeLessThan(190);
});

test("library preview starts at zero and preserves the editor cursor", async ({ page }) => {
  await mount(page);
  const run = await play(page, afterglow, {
    cursor: 100,
    mode: "pattern",
  });
  expect(bursts(run.samples, run.sampleRate)).toHaveLength(3);
  expect(run.starts).toEqual([]);
  expect(run.phonePatterns[0]!.discretePattern.map((tap) => tap.time)).toEqual([0, 75, 150]);
  expect(
    await page.evaluate(
      () => (window as unknown as { __controls: { playhead: number } }).__controls.playhead,
    ),
  ).toBe(100);
  const ranged = await play(page, afterglow, {
    cursor: 100,
    range: { start: 25, end: 80 },
    mode: "pattern",
  });
  expect(bursts(ranged.samples, ranged.sampleRate)).toHaveLength(1);
  expect(ranged.phonePatterns[0]!.discretePattern.map((tap) => tap.time)).toEqual([50]);
});

test("the separate library player leaves the editor cursor fixed during its audition", async ({
  page,
}) => {
  await mount(page);
  const result = await page.evaluate(async (pattern) => {
    const read = () =>
      window as unknown as {
        __controls: { setPlayhead: (time: number) => void; playhead: number; playing: boolean };
        __second: {
          play: (pattern: Pattern, range?: unknown, mode?: string) => void;
          playing: boolean;
        };
        __blocks: IBlock[];
        __sampleRate: number;
      };
    const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    read().__controls.setPlayhead(100);
    await wait(50);
    read().__blocks.length = 0;
    read().__second.play(pattern, undefined, "pattern");
    const positions: number[] = [];
    for (const started = performance.now(); performance.now() - started < 5000;) {
      positions.push(read().__controls.playhead);
      if (read().__blocks.length * 128 >= 0.4 * read().__sampleRate) break;
      await wait(10);
    }
    return {
      positions,
      playing: read().__controls.playing,
      samples: read().__blocks.flatMap((block) => block.samples),
      sampleRate: read().__sampleRate,
    };
  }, afterglow);
  expect(new Set(result.positions)).toEqual(new Set([100]));
  expect(result.playing).toBe(false);
  expect(bursts(result.samples, result.sampleRate)).toHaveLength(3);
});

test("preset and project switches restore independent in-memory views and scrub cursors", async ({
  page,
}) => {
  await mount(page);
  const result = await page.evaluate(async () => {
    interface IState {
      __controls: { setPlayhead: (time: number) => void; playhead: number };
      __composer: {
        viewport: { startMs: number; durationMs: number };
        setViewport: (view: { startMs: number; durationMs: number }) => void;
      };
      __setInstance: (key: string) => void;
      __playback: { editorChanges: number };
    }
    const read = () => window as unknown as IState;
    const flush = () =>
      new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const switchTo = async (key: string) => {
      read().__setInstance(key);
      await flush();
    };
    const set = async (cursor: number, startMs: number, durationMs: number) => {
      read().__controls.setPlayhead(cursor);
      read().__composer.setViewport({ startMs, durationMs });
      await flush();
    };
    const snapshot = () => ({
      cursor: read().__controls.playhead,
      viewport: read().__composer.viewport,
    });
    await set(100, 50, 200);
    await switchTo("project-a/preset-b");
    const fresh = snapshot();
    await set(200, 100, 300);
    await switchTo("project-b/preset-a");
    await set(300, 200, 100);
    await switchTo("project-a/preset-a");
    const first = snapshot();
    await switchTo("project-a/preset-b");
    const second = snapshot();
    await switchTo("project-b/preset-a");
    return {
      fresh,
      first,
      second,
      otherProject: snapshot(),
      edits: read().__playback.editorChanges,
    };
  });
  expect(result).toEqual({
    fresh: { cursor: 0, viewport: { startMs: 0, durationMs: 500 } },
    first: { cursor: 100, viewport: { startMs: 50, durationMs: 200 } },
    second: { cursor: 200, viewport: { startMs: 100, durationMs: 300 } },
    otherProject: { cursor: 300, viewport: { startMs: 200, durationMs: 100 } },
    edits: 0,
  });
  await page.reload();
  await expect(page.locator("#playing")).toHaveText("false");
  expect(
    await page.evaluate(() => {
      const state = window as unknown as {
        __controls: { playhead: number };
        __composer: { viewport: unknown };
      };
      return { cursor: state.__controls.playhead, viewport: state.__composer.viewport };
    }),
  ).toEqual({ cursor: 0, viewport: { startMs: 0, durationMs: 500 } });
});

test("a second playback taking the sound ends the first, and stopping the first spares it", async ({
  page,
}) => {
  await mount(page);
  const result = await page.evaluate(async (pattern) => {
    const state = window as unknown as {
      __controls: { play: (pattern: Pattern) => void; stop: () => void; playing: boolean };
      __second: { play: (pattern: Pattern, range?: unknown, mode?: string) => void };
      __blocks: IBlock[];
    };
    const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    state.__controls.play(pattern);
    await wait(80);
    state.__blocks.length = 0;
    state.__second.play(pattern, undefined, "pattern");
    await wait(100);
    const firstPlaying = (window as unknown as { __controls: { playing: boolean } }).__controls
      .playing;
    state.__controls.stop();
    // Wait on recorded audio time; headless audio can run slower than the wall clock.
    for (const started = performance.now(); performance.now() - started < 5000;) {
      if (state.__blocks.length * 128 >= 0.4 * 44100) break;
      await wait(10);
    }
    return { firstPlaying, samples: state.__blocks.flatMap((block) => block.samples) };
  }, afterglow);
  expect(result.firstPlaying).toBe(false);
  expect(bursts(result.samples, 44100)).toHaveLength(3);
});

test("a range keeps the playhead inside while its last tap rings out", async ({ page }) => {
  await mount(page);
  const run = await play(page, afterglow, { range: { start: 0, end: 80 } });
  const heard = bursts(run.samples, run.sampleRate);
  expect(heard).toHaveLength(2);
  expect(heard[1]!.length).toBeGreaterThan(18);
  expect(Math.max(...run.playheads)).toBeLessThanOrEqual(80);
});

test("auditions always sound while editor playback follows the sound toggle", async ({ page }) => {
  await mount(page);
  const audition = await play(page, afterglow, { sound: false });
  expect(bursts(audition.samples, audition.sampleRate)).toHaveLength(3);
  expect(audition.messages).toEqual(["play"]);
  const editor = await play(page, afterglow, { sound: false, mode: "document" });
  expect(bursts(editor.samples, editor.sampleRate)).toHaveLength(0);
  expect(editor.messages).toEqual(["play"]);
  const silentPhone = await play(page, afterglow, { onPhone: false });
  expect(bursts(silentPhone.samples, silentPhone.sampleRate)).toHaveLength(3);
  expect(silentPhone.messages).toEqual(["stop"]);
});

test("a newer playSound or stop cancels one still preparing", async ({ page }) => {
  await mount(page);
  const counts = await page.evaluate(async () => {
    const state = window as unknown as { __blocks: IBlock[]; __sampleRate: number };
    const modulePath = "/src/features/composer/audio.ts";
    const { playSound, stopSound } = await import(modulePath);
    const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    const tap = (time: number) => ({ time, amplitude: 1, frequency: 0.5 });
    const empty = { amplitude: [], frequency: [] };
    const twoTaps = { discretePattern: [tap(0), tap(100)], continuousPattern: empty };
    const oneTap = { discretePattern: [tap(0)], continuousPattern: empty };
    const heard = async (start: () => void) => {
      state.__blocks.length = 0;
      start();
      // Wait on recorded audio time; headless audio can run slower than the wall clock.
      for (const started = performance.now(); performance.now() - started < 5000;) {
        if (state.__blocks.length * 128 >= 0.4 * state.__sampleRate) break;
        await wait(10);
      }
      let count = 0;
      let silent = Infinity;
      for (const value of state.__blocks.flatMap((block) => block.samples)) {
        if (Math.abs(value) < 1e-3) silent++;
        else {
          if (silent > 0.01 * state.__sampleRate) count++;
          silent = 0;
        }
      }
      return count;
    };
    return [
      await heard(() => {
        playSound(twoTaps);
        playSound(oneTap);
      }),
      await heard(() => {
        playSound(twoTaps);
        stopSound();
      }),
    ];
  });
  expect(counts).toEqual([1, 0]);
});
