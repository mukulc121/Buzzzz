import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { unzipSync } from "fflate";
import { editorPlay, editorStop } from "./fixtures/editor-playback";
import { patternTitle } from "./fixtures/pattern-title";

const sampleAudio = unzipSync(
  readFileSync(
    new URL(
      "../../apps/studio/src/features/project/starter/starting-demo-project.pulsar",
      import.meta.url,
    ),
  ),
)["audio/fanfaresound.mp3"]!;

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("buzzzz.onboarding.seen", "true"));
  await page.routeWebSocket("**/relay?role=studio", (socket) =>
    socket.send(JSON.stringify({ type: "peers", phones: 0 })),
  );
  await page.goto("/");
  await page.getByRole("tab", { name: "sound", exact: true }).click();
  await page.getByLabel("Audio file", { exact: true }).setInputFiles({
    name: "fanfaresound.mp3",
    mimeType: "audio/mpeg",
    buffer: Buffer.from(sampleAudio),
  });
  await expect(page.getByRole("img", { name: "Audio waveform", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Media", exact: true }).click();
});

async function startPreview(page: Page) {
  const row = page.locator(".media-item").filter({ hasText: "fanfaresound.mp3" });
  await row.click({ button: "right" });
  await page.getByRole("menuitem", { name: "Play", exact: true }).click();
}

async function newProject(page: Page) {
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await page
    .locator(".project-dashboard-header")
    .getByRole("button", { name: "Create new project", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Create project", exact: true });
  await dialog.getByRole("textbox", { name: "Project name", exact: true }).fill("After preview");
  await dialog.getByRole("button", { name: "Create", exact: true }).click();
  await expect(patternTitle(page)).toBeVisible();
}

async function observeAudio(page: Page) {
  await page.evaluate(() => {
    const audio = new Set<HTMLMediaElement>();
    const pauses = new Map<HTMLMediaElement, number>();
    Object.assign(window, { mediaPreviewAudio: audio, mediaPreviewPauses: pauses });
    const play = HTMLMediaElement.prototype.play;
    const pause = HTMLMediaElement.prototype.pause;
    HTMLMediaElement.prototype.play = function () {
      audio.add(this);
      return play.call(this);
    };
    HTMLMediaElement.prototype.pause = function () {
      if (audio.has(this)) pauses.set(this, (pauses.get(this) ?? 0) + 1);
      pause.call(this);
    };
  });
}

async function audioState(page: Page) {
  return page.evaluate(() => {
    const audio: unknown = Reflect.get(window, "mediaPreviewAudio");
    const pauses: unknown = Reflect.get(window, "mediaPreviewPauses");
    if (!(audio instanceof Set) || !(pauses instanceof Map))
      throw new Error("Missing native audio observer");
    return [...audio].map((element: unknown) => {
      if (!(element instanceof HTMLMediaElement)) throw new Error("Invalid audio element");
      return { paused: element.paused, pauses: Number(pauses.get(element) ?? 0) };
    });
  });
}

async function holdBlobRead(page: Page) {
  let reads = 0;
  await page.exposeFunction("mediaBlobReadStarted", () => reads++);
  await page.evaluate(() => {
    const notify: unknown = Reflect.get(window, "mediaBlobReadStarted");
    if (typeof notify !== "function") throw new Error("Missing blob read observer");
    const pending = new Promise<void>((resolve) => {
      window.addEventListener("release-media-blob", () => resolve(), { once: true });
    });
    const get = IDBObjectStore.prototype.get;
    let held = false;
    IDBObjectStore.prototype.get = function (query) {
      const request = get.call(this, query);
      if (this.name === "blobs" && !held) {
        held = true;
        request.addEventListener(
          "success",
          (event) => {
            event.stopImmediatePropagation();
            void notify();
            void pending.then(() => request.dispatchEvent(new Event("success")));
          },
          { once: true },
        );
      }
      return request;
    };
  });
  return () => reads;
}

async function releaseBlobRead(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        window.dispatchEvent(new Event("release-media-blob"));
        requestAnimationFrame(() => resolve());
      }),
  );
}

for (const action of ["Stop", "project change", "leaving the editor"] as const) {
  test(`${action} cancels an audio preview while its real browser file read is pending`, async ({
    page,
  }) => {
    await observeAudio(page);
    const reads = await holdBlobRead(page);
    await startPreview(page);
    await expect.poll(reads).toBe(1);
    if (action === "Stop") {
      await expect(editorStop(page)).toBeVisible();
      await page.keyboard.press("p");
      await expect(editorPlay(page)).toBeVisible();
    } else if (action === "project change") await newProject(page);
    else await page.getByRole("button", { name: "Projects", exact: true }).click();
    await releaseBlobRead(page);
    expect(await audioState(page)).toEqual([]);
    if (action !== "leaving the editor") await expect(editorPlay(page)).toBeVisible();
    await expect(page.getByRole("alert")).toHaveCount(0);
  });
}

test("a project change stops a pending real audio play and its later completion stays canceled", async ({
  page,
}) => {
  await observeAudio(page);
  let settled = 0;
  await page.exposeFunction("mediaPreviewPlaySettled", () => settled++);
  await page.evaluate(() => {
    const notify: unknown = Reflect.get(window, "mediaPreviewPlaySettled");
    if (typeof notify !== "function") throw new Error("Missing play observer");
    const audio: unknown = Reflect.get(window, "mediaPreviewAudio");
    if (!(audio instanceof Set)) throw new Error("Missing native audio observer");
    const pending = new Promise<void>((resolve) => {
      window.addEventListener("release-media-play", () => resolve(), { once: true });
    });
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      audio.add(this);
      return pending.then(() => play.call(this)).finally(() => void notify());
    };
  });
  await startPreview(page);
  await expect(editorStop(page)).toBeVisible();
  await newProject(page);
  expect((await audioState(page))[0]?.pauses).toBeGreaterThan(0);
  await page.evaluate(() => window.dispatchEvent(new Event("release-media-play")));
  await expect.poll(() => settled).toBe(1);
  await expect.poll(async () => (await audioState(page)).every((audio) => audio.paused)).toBe(true);
  await expect(editorPlay(page)).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
});
