import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { unzipSync } from "fflate";

const sampleAudio = unzipSync(
  new Uint8Array(
    readFileSync(
      new URL(
        "../../apps/studio/src/features/project/starter/starting-demo-project.pulsar",
        import.meta.url,
      ),
    ),
  ),
)["audio/fanfaresound.mp3"]!;

interface IMediaProbe {
  elements: HTMLMediaElement[];
  calls: number;
  rejections: { name: string; message: string }[];
  revokeNext: boolean;
}

function observePlayback() {
  const state = window as typeof window & { mediaProbe: IMediaProbe };
  state.mediaProbe = { elements: [], calls: 0, rejections: [], revokeNext: false };
  const original = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () {
    const probe = state.mediaProbe;
    if (!probe.elements.includes(this)) probe.elements.push(this);
    probe.calls++;
    if (probe.revokeNext) {
      probe.revokeNext = false;
      URL.revokeObjectURL(this.src);
    }
    const result = original.call(this);
    void result.catch((error: unknown) => {
      if (error instanceof Error)
        probe.rejections.push({ name: error.name, message: error.message });
    });
    return result;
  };
}

function mediaState(page: Page) {
  return page.evaluate(() => {
    const { mediaProbe } = window as typeof window & { mediaProbe: IMediaProbe };
    return {
      calls: mediaProbe.calls,
      rejections: mediaProbe.rejections,
      playhead: Number(document.querySelector("[data-playhead]")?.getAttribute("aria-valuenow")),
      elements: mediaProbe.elements.map((element) => ({
        currentTime: element.currentTime,
        duration: element.duration,
        paused: element.paused,
        ended: element.ended,
        error: element.error?.code ?? null,
      })),
    };
  });
}

async function createAudioOnlyPattern(page: Page) {
  await page.getByRole("button", { name: "New pattern", exact: true }).click();
  await expect(page.getByRole("heading", { name: "No audio attached", exact: true })).toBeVisible();
  await page.getByLabel("Audio file", { exact: true }).setInputFiles({
    name: "fanfaresound.mp3",
    mimeType: "audio/mpeg",
    buffer: Buffer.from(sampleAudio),
  });
  await expect(
    page.getByRole("tabpanel", { name: "sound", exact: true }).getByText("fanfaresound.mp3"),
  ).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(observePlayback);
  await page.addInitScript(() => localStorage.setItem("buzzzz.onboarding.seen", "true"));
  await page.routeWebSocket("**/relay?role=studio", (socket) =>
    socket.send(JSON.stringify({ type: "peers", phones: 0 })),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await page
    .locator(".project-dashboard-header")
    .getByRole("button", { name: "Create sample project", exact: true })
    .click();
  await page
    .getByRole("complementary", { name: "Project patterns", exact: true })
    .getByRole("button", { name: "FanfareSound", exact: true })
    .click();
  await page.getByRole("tab", { name: "sound", exact: true }).click();
  await expect(
    page.getByRole("tabpanel", { name: "sound", exact: true }).getByText("fanfaresound.mp3"),
  ).toBeVisible();
});

test("sample FanfareSound plays its real MP3 once while the haptic preview prepares", async ({
  page,
}) => {
  const header = page.locator(".pattern-header");
  await header.getByRole("button", { name: "Play", exact: true }).click();
  await expect
    .poll(async () => (await mediaState(page)).elements.at(-1)?.currentTime)
    .toBeGreaterThan(0.5);
  const playing = await mediaState(page);
  expect(playing.calls).toBe(1);
  expect(playing.elements[0]).toMatchObject({ paused: false, error: null });
  expect(playing.elements[0]!.duration).toBeCloseTo(4.704, 2);
  expect(playing.rejections).toEqual([]);
  await expect(header.getByRole("button", { name: "Play", exact: true })).toBeVisible({
    timeout: 10000,
  });
  expect((await mediaState(page)).elements[0]!.ended).toBe(true);
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("sample audio can stop and restart without reporting canceled playback as an error", async ({
  page,
}) => {
  const header = page.locator(".pattern-header");
  for (let index = 0; index < 3; index++) {
    await header.getByRole("button", { name: "Play", exact: true }).click();
    await header.getByRole("button", { name: "Stop", exact: true }).click();
    await expect
      .poll(async () => (await mediaState(page)).elements.every((element) => element.paused))
      .toBe(true);
  }
  await header.getByRole("button", { name: "Play", exact: true }).click();
  await expect
    .poll(async () => (await mediaState(page)).elements.at(-1)?.currentTime)
    .toBeGreaterThan(0.5);
  const restarted = await mediaState(page);
  expect(restarted.calls).toBe(4);
  expect(restarted.elements.slice(0, -1).every((element) => element.paused)).toBe(true);
  expect(restarted.elements.at(-1)).toMatchObject({ paused: false, error: null });
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("the sample trimming preview seeks and restarts the actual audio", async ({ page }) => {
  await page.getByRole("button", { name: "Open trimming tool", exact: true }).click();
  const trim = page.getByRole("dialog", { name: "Audio trim", exact: true });
  await trim.getByRole("spinbutton", { name: "Start", exact: true }).fill("500");
  await trim.getByRole("spinbutton", { name: "End", exact: true }).fill("2500");
  for (let index = 0; index < 2; index++) {
    const preview = trim.getByRole("button", { name: "Preview", exact: true });
    if (index === 0)
      await preview.evaluate((button) => {
        if (!(button instanceof HTMLButtonElement)) throw new Error("Missing preview button");
        button.click();
        button.click();
      });
    else await preview.click();
    await expect
      .poll(async () => (await mediaState(page)).elements.at(-1)?.currentTime)
      .toBeGreaterThan(0.65);
    await trim.getByRole("button", { name: "Stop preview", exact: true }).click();
    await expect
      .poll(async () => (await mediaState(page)).elements.every((element) => element.paused))
      .toBe(true);
  }
  const previewed = await mediaState(page);
  expect(previewed.calls).toBe(3);
  expect(previewed.rejections.some((error) => error.name === "AbortError")).toBe(true);
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("audio-only playback reaches the real file end without clipping its tail", async ({
  page,
}) => {
  await createAudioOnlyPattern(page);
  const header = page.locator(".pattern-header");
  await header.getByRole("button", { name: "Play", exact: true }).click();
  await expect(header.getByRole("button", { name: "Stop", exact: true })).toBeVisible();
  await expect(header.getByRole("button", { name: "Play", exact: true })).toBeVisible({
    timeout: 10000,
  });
  const completed = await mediaState(page);
  expect(completed.calls).toBe(1);
  expect(completed.elements[0]).toMatchObject({ ended: true, paused: true, error: null });
  expect(completed.elements[0]!.currentTime).toBeCloseTo(4.704, 2);
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("the editor cursor follows actual media time relative to the source trim start", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Open trimming tool", exact: true }).click();
  const trim = page.getByRole("dialog", { name: "Audio trim", exact: true });
  await trim.getByRole("spinbutton", { name: "Start", exact: true }).fill("500");
  await trim.getByRole("button", { name: "Apply trim", exact: true }).click();
  await page.locator(".pattern-header").getByRole("button", { name: "Play", exact: true }).click();
  await expect
    .poll(async () => (await mediaState(page)).elements.at(-1)?.currentTime)
    .toBeGreaterThan(0.8);
  const playing = await mediaState(page);
  expect(Math.abs(playing.playhead - (playing.elements[0]!.currentTime * 1000 - 500))).toBeLessThan(
    75,
  );
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("a selected range clips the real track and loops restart without stale failures", async ({
  page,
}) => {
  await createAudioOnlyPattern(page);
  await page.getByRole("tab", { name: "inspector", exact: true }).click();
  await page.getByRole("spinbutton", { name: "Playback range end", exact: true }).fill("1000");
  await page.getByRole("spinbutton", { name: "Playback range start", exact: true }).fill("500");
  const header = page.locator(".pattern-header");
  await header.getByRole("button", { name: "Play", exact: true }).click();
  await expect(header.getByRole("button", { name: "Play", exact: true })).toBeVisible();
  const ranged = (await mediaState(page)).elements[0]!;
  expect(ranged.paused).toBe(true);
  expect(ranged.ended).toBe(false);
  expect(ranged.currentTime).toBeGreaterThan(0.8);
  expect(ranged.currentTime).toBeLessThan(1.1);
  await page.getByRole("switch", { name: "Loop", exact: true }).check();
  await header.getByRole("button", { name: "Play", exact: true }).click();
  await expect.poll(async () => (await mediaState(page)).calls).toBeGreaterThanOrEqual(4);
  await header.getByRole("button", { name: "Stop", exact: true }).click();
  expect((await mediaState(page)).elements.every((element) => element.paused)).toBe(true);
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("a genuine current-track media failure still reports an error", async ({ page }) => {
  await page.evaluate(() => {
    const { mediaProbe } = window as typeof window & { mediaProbe: IMediaProbe };
    mediaProbe.revokeNext = true;
  });
  await page.locator(".pattern-header").getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveText("Audio playback could not start");
  await expect.poll(async () => (await mediaState(page)).elements.at(-1)?.error).not.toBeNull();
  expect((await mediaState(page)).calls).toBe(1);
});
