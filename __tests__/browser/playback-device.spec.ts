import { patternTitle } from "./fixtures/pattern-title";
import { expect, test, type Page } from "@playwright/test";
import { parseMessage, type Msg } from "@buzzzz/core";

const afterglow = {
  continuousPattern: { amplitude: [], frequency: [] },
  discretePattern: [
    { time: 0, amplitude: 1, frequency: 0.3 },
    { time: 75, amplitude: 0.703, frequency: 0.203 },
    { time: 150, amplitude: 0.5, frequency: 0.1 },
  ],
};

function observeAudio() {
  const count = (key: string) => {
    const root = document.documentElement;
    root.setAttribute(key, String(Number(root.getAttribute(key) ?? 0) + 1));
  };
  const start = AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start = function (...args) {
    if (!(this.context instanceof OfflineAudioContext)) count("data-device-sound-starts");
    return start.apply(this, args);
  };
  const play = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () {
    count("data-device-audio-starts");
    return play.call(this);
  };
}

async function openEditor(page: Page, phones = 0, durationMs = 4000) {
  const messages: Msg[] = [];
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.addInitScript(observeAudio);
  await page.addInitScript((durationMs: number) => {
    const record = {
      id: "device-routing",
      name: "Device routing",
      createdAt: 1,
      updatedAt: 1,
      revision: 0,
      project: {
        presets: [
          {
            id: "routing",
            name: "Routing",
            editor: { markers: [], range: null, durationMs },
            pattern: {
              discretePattern: [
                { time: 0, amplitude: 0.8, frequency: 0.5 },
                { time: 2500, amplitude: 0.8, frequency: 0.5 },
              ],
              continuousPattern: { amplitude: [], frequency: [] },
            },
          },
        ],
        map: {},
      },
    };
    localStorage.setItem("buzzzz.onboarding.seen", "true");
    localStorage.setItem("buzzzz.project.device-routing", JSON.stringify(record));
    localStorage.setItem("buzzzz.lastProject", "device-routing");
  }, durationMs);
  await page.routeWebSocket("**/relay?role=studio", (socket) => {
    socket.onMessage((data) => {
      if (typeof data !== "string") return;
      const message = parseMessage(data);
      if (message) messages.push(message);
    });
    socket.send(JSON.stringify({ type: "peers", phones }));
  });
  await page.goto("/studio/projects/device-routing");
  await expect(patternTitle(page)).toHaveText("Routing");
  return messages;
}

function starts(page: Page, kind: "sound" | "audio") {
  return page.locator("html").getAttribute(`data-device-${kind}-starts`).then(Number);
}

async function started(page: Page) {
  await expect
    .poll(async () =>
      Number(
        await page
          .getByRole("slider", { name: "Playback position", exact: true })
          .first()
          .getAttribute("aria-valuenow"),
      ),
    )
    .toBeGreaterThan(100);
}

function wav() {
  const rate = 8000;
  const samples = rate;
  const buffer = Buffer.alloc(44 + samples * 2);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(buffer.length - 8, 4);
  buffer.write("WAVEfmt ", 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(rate, 24);
  buffer.writeUInt32LE(rate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(samples * 2, 40);
  for (let index = 0; index < samples; index++)
    buffer.writeInt16LE(
      Math.round(Math.sin((2 * Math.PI * 440 * index) / rate) * 4000),
      44 + index * 2,
    );
  return buffer;
}

test("document Play opens Device without a phone even when speaker output is off", async ({
  page,
}) => {
  await openEditor(page, 0, 60000);
  await page.getByRole("switch", { name: "Haptics as sound", exact: true }).uncheck();
  await page.locator(".pattern-header").getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.getByRole("region", { name: "Device connection", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Connect device", exact: true })).toBeVisible();
  await started(page);
  expect(await starts(page, "sound")).toBe(0);
});

test("all outputs off keeps the source timeline running without opening Device", async ({
  page,
}) => {
  await openEditor(page);
  for (const name of ["Play on device", "Haptics as sound", "Audio track"])
    await page.getByRole("switch", { name, exact: true }).uncheck();
  await page.locator(".pattern-header").getByRole("button", { name: "Play", exact: true }).click();
  await started(page);
  await expect(page.getByRole("region", { name: "Device connection", exact: true })).toHaveCount(0);
  expect(await starts(page, "sound")).toBe(0);
  expect(await starts(page, "audio")).toBe(0);
});

test("normal synthesized sound still plays while the no-phone Device panel opens", async ({
  page,
}) => {
  await openEditor(page);
  await page.locator(".pattern-header").getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.getByRole("region", { name: "Device connection", exact: true })).toBeVisible();
  await expect.poll(() => starts(page, "sound")).toBeGreaterThan(0);
});

test("attached audio remains the speaker output and still opens the no-phone Device panel", async ({
  page,
}) => {
  await openEditor(page);
  await page.getByRole("tab", { name: "sound", exact: true }).click();
  await page
    .getByLabel("Audio file", { exact: true })
    .setInputFiles({ name: "routing.wav", mimeType: "audio/wav", buffer: wav() });
  await expect(page.getByRole("tabpanel", { name: "sound", exact: true })).toContainText(
    "routing.wav",
  );
  await page.locator(".pattern-header").getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.getByRole("region", { name: "Device connection", exact: true })).toBeVisible();
  await expect.poll(() => starts(page, "audio")).toBeGreaterThan(0);
  await started(page);
  expect(await starts(page, "sound")).toBe(0);
});

test("a connected phone and attached animation suppress synthesized sound without opening Device", async ({
  page,
}) => {
  await openEditor(page, 1);
  await page.getByRole("tab", { name: "animation", exact: true }).click();
  await page.getByLabel("Lottie file", { exact: true }).setInputFiles({
    name: "routing.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({ v: "5.12.2", fr: 60, ip: 0, op: 240, w: 100, h: 100, layers: [] }),
    ),
  });
  await expect(
    page.getByRole("region", { name: "Animation canvas preview", exact: true }).locator("canvas"),
  ).toBeVisible();
  await page.getByRole("tab", { name: "inspector", exact: true }).click();
  await expect(page.getByRole("switch", { name: "Haptics as sound", exact: true })).toBeDisabled();
  await page.locator(".pattern-header").getByRole("button", { name: "Play", exact: true }).click();
  await started(page);
  expect(await starts(page, "sound")).toBe(0);
  await expect(page.getByRole("region", { name: "Device connection", exact: true })).toHaveCount(0);
});

test("library auditions ignore document output preferences and never open Device", async ({
  page,
}) => {
  const messages = await openEditor(page, 1);
  for (const name of ["Play on device", "Haptics as sound"])
    await page.getByRole("switch", { name, exact: true }).uncheck();
  await page.getByRole("button", { name: "Tools", exact: true }).click();
  await page.getByRole("button", { name: "Pulsar Library", exact: true }).click();
  await page
    .getByRole("searchbox", { name: "Search Pulsar presets", exact: true })
    .fill("Afterglow");
  await page.getByRole("button", { name: "About Afterglow", exact: true }).click();
  await page
    .getByRole("dialog", { name: "Afterglow", exact: true })
    .getByRole("button", { name: "Play", exact: true })
    .click();
  await expect.poll(() => starts(page, "sound")).toBeGreaterThan(0);
  await expect
    .poll(() => messages.find((message) => message.type === "haptic-preset"))
    .toMatchObject({
      type: "haptic-preset",
      name: "Afterglow",
      pattern: afterglow,
    });
  await expect(page.getByRole("region", { name: "Device connection", exact: true })).toHaveCount(0);
});
