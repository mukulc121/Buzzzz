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
  samples: { time: number; rms: number; state: string }[];
  buffers: IRenderedSound[];
}
declare global {
  interface Window {
    __riveAudio: IRiveAudioProbe;
  }
}

async function installAudioProbe(page: Page) {
  await page.addInitScript(() => {
    const probe: IRiveAudioProbe = { samples: [], buffers: [] };
    window.__riveAudio = probe;
    const Native = window.AudioContext;
    window.AudioContext = class extends Native {
      constructor(options?: AudioContextOptions) {
        super(options);
        const destination = this.destination;
        const analyser = this.createAnalyser();
        const mute = this.createGain();
        mute.gain.value = 0;
        analyser.connect(mute).connect(destination);
        Object.defineProperty(this, "destination", { value: analyser });
        const samples = new Float32Array(analyser.fftSize);
        setInterval(() => {
          analyser.getFloatTimeDomainData(samples);
          probe.samples.push({
            time: performance.now(),
            state: this.state,
            rms: Math.sqrt(samples.reduce((sum, value) => sum + value * value, 0) / samples.length),
          });
        }, 20);
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
  });
}

async function openSample(page: Page, legacy = false) {
  await installAudioProbe(page);
  await page.routeWebSocket("**/relay?role=studio", (socket) =>
    socket.send(JSON.stringify({ type: "peers", phones: 0 })),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await page.getByRole("button", { name: "Create sample project", exact: true }).click();
  await expect(page.getByRole("button", { name: "DexTourLoader", exact: true })).toBeVisible();
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
  const panel = page.locator(".rive-panel");
  await expect(panel.getByRole("button", { name: "Fire isLoaded", exact: true })).toBeVisible();
  await expect(panel.getByText("Loop · Drone", { exact: true })).toBeVisible();
  await expect(page.getByRole("switch", { name: "Haptics as sound", exact: true })).toBeChecked();
  return panel;
}

async function resetProbe(page: Page) {
  await page.evaluate(() => {
    window.__riveAudio.samples = [];
    window.__riveAudio.buffers = [];
  });
}

for (const legacy of [false, true])
  test(`the ${legacy ? "migrated 1063" : "current 1069"} Rive profile renders the four-burst Drone pattern and outputs middle audio`, async ({
    page,
  }, testInfo) => {
    const panel = await openSample(page, legacy);
    await panel.getByRole("button", { name: "Play with haptics", exact: true }).click();
    await resetProbe(page);
    await expect.poll(() => page.evaluate(() => window.__riveAudio.buffers.length)).toBe(3);
    await expect(panel.getByRole("button", { name: "Resume", exact: true })).toBeVisible();
    const probe = await page.evaluate(() => window.__riveAudio);
    const proof = testInfo.outputPath("actual-rive-audio.json");
    await writeFile(proof, JSON.stringify(probe));
    await testInfo.attach("actual-rive-audio.json", {
      path: proof,
      contentType: "application/json",
    });
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
      (sample) => sample.time > drone.time + 200 && sample.time < drone.time + 1200,
    );
    expect(
      middle.filter((sample) => sample.state === "running" && sample.rms > 0.01).length,
    ).toBeGreaterThan(3);
  });

test("muting disables rendered Rive output and pausing stops the live middle source", async ({
  page,
}) => {
  const panel = await openSample(page);
  const sound = page.getByRole("switch", { name: "Haptics as sound", exact: true });
  await sound.click();
  await expect(sound).not.toBeChecked();
  await panel.getByRole("button", { name: "Play with haptics", exact: true }).click();
  await resetProbe(page);
  await expect(panel.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
  await expect(panel.getByRole("button", { name: "Resume", exact: true })).toBeVisible();
  expect(await page.evaluate(() => window.__riveAudio.buffers)).toEqual([]);
  await sound.click();
  await panel.getByRole("button", { name: "Play with haptics", exact: true }).click();
  await resetProbe(page);
  await expect.poll(() => page.evaluate(() => window.__riveAudio.buffers.length)).toBe(2);
  await panel.getByRole("button", { name: "Pause", exact: true }).click();
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
