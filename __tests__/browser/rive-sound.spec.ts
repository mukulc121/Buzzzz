import { openRiveInspector, setRiveSound } from "./fixtures/rive-controls";
import { expect, test, type Page } from "@playwright/test";
import type { IRiveConfig } from "@buzzzz/core";
import { writeFile } from "node:fs/promises";
import { DEX_RIVE_CONFIG_1063 } from "../../apps/studio/src/features/project/starter/rive/dex-rive-config-1063";

interface IRenderedSound {
  time: number;
  when: number;
  duration: number;
  rms: number[];
  stopped?: number;
  stoppedAudioMs?: number;
}
interface IRiveAudioProbe {
  samples: { time: number; audioMs: number; rms: number; state: string }[];
  buffers: IRenderedSound[];
  events: { name: string; time: number; detail?: unknown }[];
  pauseOnMiddle: boolean;
  renders: { time: number; duration: number; resolved?: number }[];
  contexts: number;
  mounts: number[];
}
declare global {
  interface Window {
    __riveAudio: IRiveAudioProbe;
    __releaseRiveRenders: () => void;
  }
}

async function installAudioProbe(page: Page, holdRenders = false) {
  await page.addInitScript((holdRenders) => {
    const probe: IRiveAudioProbe = {
      samples: [],
      buffers: [],
      events: [],
      pauseOnMiddle: false,
      renders: [],
      contexts: 0,
      mounts: [],
    };
    window.__riveAudio = probe;
    const NativeOffline = window.OfflineAudioContext;
    const released = new Promise<void>((resolve) => {
      window.__releaseRiveRenders = resolve;
      if (!holdRenders) resolve();
    });
    window.OfflineAudioContext = class extends NativeOffline {
      startRendering() {
        const render: IRiveAudioProbe["renders"][number] = {
          time: performance.now(),
          duration: this.length / this.sampleRate,
        };
        probe.renders.push(render);
        return super.startRendering().then(async (buffer) => {
          await released;
          render.resolved = performance.now();
          return buffer;
        });
      }
    };
    const Native = window.AudioContext;
    window.AudioContext = class extends Native {
      constructor(options?: AudioContextOptions) {
        super(options);
        probe.contexts++;
        const destination = this.destination;
        const analyser = this.createAnalyser();
        const mute = this.createGain();
        mute.gain.value = 0;
        analyser.connect(mute).connect(destination);
        Object.defineProperty(this, "destination", { value: analyser });
        const worklet = URL.createObjectURL(
          new Blob(
            [
              `
          registerProcessor("rive-output-proof", class extends AudioWorkletProcessor {
            process(inputs) {
              const samples = inputs[0]?.[0];
              if (samples?.length) this.port.postMessage({
                audioMs: currentFrame / sampleRate * 1000,
                rms: Math.sqrt(samples.reduce((sum, value) => sum + value * value, 0) / samples.length),
              });
              return true;
            }
          });
        `,
            ],
            { type: "application/javascript" },
          ),
        );
        void this.audioWorklet.addModule(worklet).then(() => {
          URL.revokeObjectURL(worklet);
          const output = new AudioWorkletNode(this, "rive-output-proof");
          output.port.onmessage = (event: MessageEvent<{ audioMs: number; rms: number }>) => {
            probe.samples.push({ time: performance.now(), state: "running", ...event.data });
          };
          analyser.connect(output).connect(mute);
        });
      }
      createBufferSource() {
        const node = super.createBufferSource();
        const start = node.start.bind(node);
        const stop = node.stop.bind(node);
        let rendered: IRenderedSound | undefined;
        node.start = (when = 0, offset = 0, duration?: number) => {
          const buffer = node.buffer;
          if (buffer) {
            const pcm = buffer.getChannelData(0);
            const step = Math.round(buffer.sampleRate / 10);
            const rms: number[] = [];
            for (let i = 0; i < pcm.length; i += step) {
              const chunk = pcm.subarray(i, i + step);
              rms.push(
                Math.sqrt(chunk.reduce((sum, value) => sum + value * value, 0) / chunk.length),
              );
            }
            rendered = {
              time: performance.now(),
              when: when * 1000,
              duration: buffer.duration,
              rms,
            };
            probe.buffers.push(rendered);
          }
          start(when, offset, duration);
          if (probe.pauseOnMiddle && buffer && Math.abs(buffer.duration - 1.594) < 0.001) {
            probe.pauseOnMiddle = false;
            const pause = Array.from(
              document.querySelectorAll<HTMLButtonElement>(".rive-inspector .transport button"),
            ).find((button) => button.textContent?.trim() === "Pause");
            if (!pause) throw new Error("The live middle source has no Pause control");
            probe.events.push({ name: "pause-at-middle-start", time: performance.now() });
            pause.click();
          }
        };
        node.stop = (when = 0) => {
          if (rendered) {
            rendered.stopped = performance.now();
            rendered.stoppedAudioMs = this.currentTime * 1000;
          }
          stop(when);
        };
        return node;
      }
    };
  }, holdRenders);
  await page.route(/\/src\/features\/rive\/useRive\.ts(?:\?.*)?$/, async (route) => {
    const response = await route.fetch();
    const source = await response.text();
    if (!source.includes("mountHaptics();")) throw new Error("Missing actual Rive scene mount");
    await route.fulfill({
      response,
      body: source.replace(
        "mountHaptics();",
        "globalThis.__riveAudio.mounts.push(performance.now()); mountHaptics();",
      ),
    });
  });
  await page.route(/\/src\/features\/rive\/useRiveHaptics\.ts(?:\?.*)?$/, async (route) => {
    const response = await route.fetch();
    let source = await response.text();
    const replacements = [
      [
        "play: (preset) => callbacks.current.onImpact(preset)",
        'play: (preset) => { globalThis.__riveAudio.events.push({name:"cue",time:performance.now(),detail:preset}); callbacks.current.onImpact(preset); }',
      ],
      [
        "playPulsar: (cue) => callbacks.current.onImpact(cue)",
        'playPulsar: (cue) => { globalThis.__riveAudio.events.push({name:"cue",time:performance.now(),detail:cue}); callbacks.current.onImpact(cue); }',
      ],
      [
        "stopPulsar: () => callbacks.current.onStopPattern()",
        'stopPulsar: () => { globalThis.__riveAudio.events.push({name:"stop-pattern",time:performance.now()}); callbacks.current.onStopPattern(); }',
      ],
      [
        "schedule: (action, delayMs) => setTimeout(action, delayMs)",
        'schedule: (action, delayMs) => { const at=performance.now(); globalThis.__riveAudio.events.push({name:"scheduled",time:at,detail:delayMs}); return setTimeout(() => { globalThis.__riveAudio.events.push({name:"timer",time:performance.now(),detail:{delayMs,scheduledAt:at}}); action(); }, delayMs); }',
      ],
      [
        "onComplete: () => callbacks.current.onComplete()",
        'onComplete: () => { globalThis.__riveAudio.events.push({name:"complete",time:performance.now()}); callbacks.current.onComplete(); }',
      ],
      [
        "fireTrigger: (name) => callbacks.current.fireTrigger(name)",
        'fireTrigger: (name) => { globalThis.__riveAudio.events.push({name:"request-trigger",time:performance.now(),detail:name}); callbacks.current.fireTrigger(name); }',
      ],
    ];
    for (const [from, to] of replacements) {
      if (!from || !to || !source.includes(from))
        throw new Error(`Missing real Rive clock marker: ${from}`);
      source = source.replace(from, to);
    }
    await route.fulfill({ response, body: source });
  });
  await page.route(/\/src\/features\/rive\/useRiveSound\.ts(?:\?.*)?$/, async (route) => {
    const response = await route.fetch();
    let source = await response.text();
    const replacements = [
      [
        "const token = ++generation.current;",
        'const token = ++generation.current; globalThis.__riveAudio.events.push({name:"prepare",time:performance.now(),detail:{token,cue}});',
      ],
      [
        "if (token === generation.current && enabled.current)",
        'globalThis.__riveAudio.events.push({name:"prepared",time:performance.now(),detail:{token,current:generation.current,enabled:enabled.current,duration:buffer.duration}}); if (token === generation.current && enabled.current)',
      ],
      [
        "generation.current++;",
        'globalThis.__riveAudio.events.push({name:"sound-stop",time:performance.now(),detail:generation.current}); generation.current++;',
      ],
    ];
    for (const [from, to] of replacements) {
      if (!from || !to || !source.includes(from))
        throw new Error(`Missing real sound marker: ${from}`);
      source = source.replace(from, to);
    }
    await route.fulfill({ response, body: source });
  });
}

test.afterEach(async ({ page }, testInfo) => {
  if (page.isClosed()) return;
  const probe = await page.evaluate(() => window.__riveAudio).catch(() => null);
  if (!probe) return;
  const proof = testInfo.outputPath("actual-rive-audio.json");
  await writeFile(proof, JSON.stringify(probe));
  await testInfo.attach("actual-rive-audio.json", { path: proof, contentType: "application/json" });
});

async function createSample(page: Page) {
  await page.routeWebSocket("**/relay?role=studio", (socket) =>
    socket.send(JSON.stringify({ type: "peers", phones: 0 })),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await page.getByRole("button", { name: "Create sample project", exact: true }).click();
  await expect(page.getByRole("button", { name: "DexTourLoader", exact: true })).toBeVisible();
}

async function openSample(page: Page, legacy = false) {
  await installAudioProbe(page);
  await createSample(page);
  if (legacy) {
    await page.evaluate((config: IRiveConfig) => {
      const id = localStorage.getItem("buzzzz.lastProject");
      const key = `buzzzz.project.${id}`;
      const record = JSON.parse(localStorage.getItem(key) ?? "null");
      delete config.nativeSound;
      if (config.completion) delete config.completion.clock;
      record.project.riveConfig = config;
      localStorage.setItem(key, JSON.stringify(record));
    }, structuredClone(DEX_RIVE_CONFIG_1063));
    await page.reload();
  }
  await page.getByRole("button", { name: "DexTourLoader", exact: true }).click();
  await page.getByRole("tab", { name: "inspector", exact: true }).click();
  await expect(page.getByRole("switch", { name: "Haptics as sound", exact: true })).toBeChecked();
  const panel = await openRiveInspector(page);
  await expect(panel.getByRole("button", { name: "Fire isLoaded", exact: true })).toBeVisible();
  await expect(panel.getByText("Loop · Drone", { exact: true })).toBeVisible();
  return panel;
}

async function replay(page: Page, pauseOnMiddle = false) {
  await page
    .locator(".rive-inspector")
    .getByRole("button", { name: "Play with haptics", exact: true })
    .evaluate((button, pauseOnMiddle) => {
      if (!(button instanceof HTMLButtonElement)) throw new Error("Missing replay control");
      window.__riveAudio.samples = [];
      window.__riveAudio.buffers = [];
      window.__riveAudio.events = [];
      window.__riveAudio.pauseOnMiddle = pauseOnMiddle;
      button.click();
    }, pauseOnMiddle);
}

for (const legacy of [false, true])
  test(`the ${legacy ? "migrated 1063" : "current 1069"} Rive profile renders the four-burst Drone pattern and outputs middle audio`, async ({
    page,
  }) => {
    const panel = await openSample(page, legacy);
    await replay(page);
    await expect.poll(() => page.evaluate(() => window.__riveAudio.buffers.length)).toBe(3);
    await expect(panel.getByRole("button", { name: "Resume", exact: true })).toBeVisible();
    const probe = await page.evaluate(() => window.__riveAudio);
    expect(probe.renders).toHaveLength(3);
    expect(
      probe.events.filter((event) => event.name === "cue").map((event) => event.detail),
    ).toMatchObject([{ pulsar: "EngineRev" }, { pulsar: "Drone" }, { pulsar: "Lock" }]);
    for (const render of probe.renders)
      expect(render.resolved).toBeLessThanOrEqual(probe.mounts[0] ?? 0);
    const [entry, drone, exit] = probe.buffers;
    expect(entry?.duration).toBeCloseTo(1.81, 2);
    expect(drone?.duration).toBeCloseTo(1.594, 2);
    expect(exit?.duration).toBeCloseTo(0.273, 2);
    if (!drone || !exit) throw new Error("The middle and exit never reached AudioBufferSource");
    for (const index of [1, 5, 9, 14]) expect(drone.rms[index]).toBeGreaterThan(0.25);
    for (const index of [3, 12]) expect(drone.rms[index]).toBeLessThan(1e-8);
    expect(drone.stoppedAudioMs).toBeGreaterThan(drone.when);
    expect(drone.stopped).toBeLessThan(exit.time);
    const middle = probe.samples.filter(
      (sample) => sample.audioMs > drone.when + 200 && sample.audioMs < drone.when + 1200,
    );
    expect(
      middle.filter((sample) => sample.state === "running" && sample.rms > 0.01).length,
    ).toBeGreaterThan(3);
  });

test("muting disables rendered Rive output and pausing stops the live middle source", async ({
  page,
}) => {
  const panel = await openSample(page);
  await setRiveSound(page, false);
  await replay(page);
  await expect(panel.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
  await expect(panel.getByRole("button", { name: "Resume", exact: true })).toBeVisible();
  expect(await page.evaluate(() => window.__riveAudio.buffers)).toEqual([]);
  await setRiveSound(page, true);
  await replay(page, true);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window.__riveAudio.events.filter((event) => event.name === "pause-at-middle-start")
            .length,
      ),
    )
    .toBe(1);
  await expect(panel.getByRole("button", { name: "Resume", exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__riveAudio.buffers[1]?.stopped)).toBeTruthy();
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.__riveAudio.samples.slice(-3).every((sample) => sample.rms < 1e-8),
      ),
    )
    .toBe(true);
  expect(await page.evaluate(() => window.__riveAudio.buffers)).toHaveLength(2);
});

test("cold Rive playback waits for offline cue preparation and reuses it for replay and mute", async ({
  page,
}) => {
  await installAudioProbe(page, true);
  await createSample(page);
  await page.getByRole("button", { name: "DexTourLoader", exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.__riveAudio.renders.length)).toBe(3);
  expect(await page.evaluate(() => window.__riveAudio.mounts)).toEqual([]);
  expect(await page.evaluate(() => window.__riveAudio.contexts)).toBe(0);
  await page.evaluate(() => window.__releaseRiveRenders());
  const panel = await openRiveInspector(page);
  await expect(panel.getByRole("button", { name: "Fire isLoaded", exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__riveAudio.buffers.length)).toBe(3);
  await expect(panel.getByRole("button", { name: "Resume", exact: true })).toBeVisible();
  const cold = await page.evaluate(() => window.__riveAudio);
  expect(cold.mounts).toHaveLength(1);
  for (const render of cold.renders)
    expect(render.resolved).toBeLessThanOrEqual(cold.mounts[0] ?? 0);
  expect(cold.buffers.map((buffer) => Number(buffer.duration.toFixed(3)))).toEqual([
    1.81, 1.594, 0.273,
  ]);
  await replay(page);
  await expect.poll(() => page.evaluate(() => window.__riveAudio.buffers.length)).toBe(3);
  await expect(panel.getByRole("button", { name: "Resume", exact: true })).toBeVisible();
  await setRiveSound(page, false);
  await setRiveSound(page, true);
  expect(await page.evaluate(() => window.__riveAudio.renders.length)).toBe(3);
  expect(await page.evaluate(() => window.__riveAudio.mounts.length)).toBe(2);
});

test("finishing an obsolete profile render cannot activate the owner after selection changed", async ({
  page,
}) => {
  await installAudioProbe(page, true);
  await createSample(page);
  await page.getByRole("button", { name: "DexTourLoader", exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.__riveAudio.renders.length)).toBe(3);
  await page.getByRole("button", { name: "JustHaptics", exact: true }).click();
  await page.evaluate(() => window.__releaseRiveRenders());
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.__riveAudio.renders.every((render) => render.resolved !== undefined),
      ),
    )
    .toBe(true);
  await expect(page.locator(".rive-panel")).toHaveCount(0);
  expect(await page.evaluate(() => window.__riveAudio.mounts)).toEqual([]);
  expect(await page.evaluate(() => window.__riveAudio.buffers)).toEqual([]);
  await page.getByRole("button", { name: "DexTourLoader", exact: true }).click();
  const panel = await openRiveInspector(page);
  await expect(panel.getByRole("button", { name: "Fire isLoaded", exact: true })).toBeVisible();
  expect(await page.evaluate(() => window.__riveAudio.mounts.length)).toBe(1);
  expect(await page.evaluate(() => window.__riveAudio.renders.length)).toBe(6);
});
