import { editorPlay, editorStop } from "./fixtures/editor-playback";
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
  await editorPlay(page).click();
  await expect
    .poll(async () => (await mediaState(page)).elements.at(-1)?.currentTime)
    .toBeGreaterThan(0.5);
  const playing = await mediaState(page);
  expect(playing.calls).toBe(1);
  expect(playing.elements[0]).toMatchObject({ paused: false, error: null });
  expect(playing.elements[0]!.duration).toBeCloseTo(4.704, 2);
  expect(playing.rejections).toEqual([]);
  await expect(editorPlay(page)).toBeVisible({
    timeout: 10000,
  });
  expect((await mediaState(page)).elements[0]!.ended).toBe(true);
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("sample audio can stop and restart without reporting canceled playback as an error", async ({
  page,
}) => {
  for (let index = 0; index < 3; index++) {
    await editorPlay(page).click();
    await editorStop(page).click();
    await expect
      .poll(async () => (await mediaState(page)).elements.every((element) => element.paused))
      .toBe(true);
  }
  await editorPlay(page).click();
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
  await editorPlay(page).click();
  await expect(editorStop(page)).toBeVisible();
  await expect(editorPlay(page)).toBeVisible({
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
  await editorPlay(page).click();
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
  await editorPlay(page).click();
  await expect(editorPlay(page)).toBeVisible();
  const ranged = (await mediaState(page)).elements[0]!;
  expect(ranged.paused).toBe(true);
  expect(ranged.ended).toBe(false);
  expect(ranged.currentTime).toBeGreaterThan(0.8);
  expect(ranged.currentTime).toBeLessThan(1.1);
  await page.getByRole("switch", { name: "Loop", exact: true }).check();
  await editorPlay(page).click();
  await expect.poll(async () => (await mediaState(page)).calls).toBeGreaterThanOrEqual(4);
  await editorStop(page).click();
  expect((await mediaState(page)).elements.every((element) => element.paused)).toBe(true);
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("a selected range waits for delayed real audio to reach its source boundary", async ({
  page,
}) => {
  interface IMediaGate {
    audio: HTMLMediaElement | null;
    pauses: number[];
    started: Promise<void> | null;
    release: () => void;
  }
  await createAudioOnlyPattern(page);
  await page.getByRole("tab", { name: "inspector", exact: true }).click();
  await page.getByRole("spinbutton", { name: "Playback range end", exact: true }).fill("1000");
  await page.getByRole("spinbutton", { name: "Playback range start", exact: true }).fill("500");
  const now = await page.evaluate(() => Date.now());
  await page.clock.install({ time: now });
  await page.clock.setFixedTime(now);
  await page.clock.pauseAt(now);
  await page.evaluate(() => {
    const play = HTMLMediaElement.prototype.play;
    const pause = HTMLMediaElement.prototype.pause;
    let release = () => {};
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    const gate: IMediaGate = { audio: null, pauses: [], started: null, release };
    Object.assign(window, { rangeMediaGate: gate });
    const start = async (audio: HTMLMediaElement) => {
      if (audio.readyState < HTMLMediaElement.HAVE_METADATA)
        await new Promise<void>((resolve, reject) => {
          audio.addEventListener("loadedmetadata", () => resolve(), { once: true });
          audio.addEventListener("error", () => reject(new Error("Sample audio did not load")), {
            once: true,
          });
        });
      audio.playbackRate = 0;
      await play.call(audio);
    };
    HTMLMediaElement.prototype.play = function () {
      gate.audio = this;
      gate.started = pending.then(() => start(this));
      return gate.started;
    };
    HTMLMediaElement.prototype.pause = function () {
      pause.call(this);
      if (this === gate.audio) gate.pauses.push(this.currentTime);
    };
  });
  await editorPlay(page).click();
  await page.clock.runFor(600);
  expect(
    await page.evaluate(() => (Reflect.get(window, "rangeMediaGate") as IMediaGate).pauses),
  ).toEqual([]);
  await page.evaluate(async () => {
    const gate = Reflect.get(window, "rangeMediaGate") as IMediaGate;
    gate.release();
    if (!gate.started) throw new Error("The sample did not request playback");
    await gate.started;
  });
  expect((await mediaState(page)).elements[0]).toMatchObject({
    currentTime: 0.5,
    paused: false,
    ended: false,
    error: null,
  });
  const seek = (time: number) =>
    page.evaluate(async (position) => {
      const audio = (Reflect.get(window, "rangeMediaGate") as IMediaGate).audio;
      if (!audio) throw new Error("The sample audio element is missing");
      await new Promise<void>((resolve, reject) => {
        audio.addEventListener("seeked", () => resolve(), { once: true });
        audio.addEventListener("error", () => reject(new Error("Sample audio could not seek")), {
          once: true,
        });
        audio.currentTime = position;
      });
    }, time);
  await seek(0.999);
  await page.clock.runFor(20);
  expect(
    await page.evaluate(() => (Reflect.get(window, "rangeMediaGate") as IMediaGate).pauses),
  ).toEqual([]);
  await seek(1);
  await page.clock.runFor(20);
  expect(
    await page.evaluate(() => (Reflect.get(window, "rangeMediaGate") as IMediaGate).pauses),
  ).toEqual([1]);
  await expect(editorPlay(page)).toBeVisible();
  const ranged = (await mediaState(page)).elements[0]!;
  expect(ranged).toMatchObject({ currentTime: 1, paused: true, ended: false, error: null });
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("a genuine current-track media failure still reports an error", async ({ page }) => {
  await page.evaluate(() => {
    const { mediaProbe } = window as typeof window & { mediaProbe: IMediaProbe };
    mediaProbe.revokeNext = true;
  });
  await editorPlay(page).click();
  await expect(page.getByRole("alert")).toHaveText("Audio playback could not start");
  await expect.poll(async () => (await mediaState(page)).elements.at(-1)?.error).not.toBeNull();
  expect((await mediaState(page)).calls).toBe(1);
});
