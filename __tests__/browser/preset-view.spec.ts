import { expect, test, type Page } from "@playwright/test";

const patternName = (page: Page) =>
  page.getByRole("textbox", { name: "Pattern name", exact: true });
const slider = (page: Page, name: string) => page.getByRole("slider", { name, exact: true });

async function view(page: Page) {
  return {
    start: Number(await slider(page, "Timeline view start").getAttribute("aria-valuenow")),
    end: Number(await slider(page, "Timeline view end").getAttribute("aria-valuenow")),
    cursor: Number(await slider(page, "Scrub position").getAttribute("aria-valuenow")),
  };
}

async function importSecondPattern(page: Page) {
  const media = page.getByRole("button", { name: "Media", exact: true });
  if ((await media.getAttribute("aria-pressed")) !== "true") await media.click();
  await page.getByRole("button", { name: "Upload media", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Upload media", exact: true });
  await dialog.getByLabel("Media files", { exact: true }).setInputFiles({
    name: "View B.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        continuousPattern: {
          amplitude: [
            { time: 0, value: 0.5 },
            { time: 600, value: 0.5 },
          ],
          frequency: [
            { time: 0, value: 0.5 },
            { time: 600, value: 0.5 },
          ],
        },
        discretePattern: [],
      }),
    ),
  });
  await expect(dialog).not.toBeVisible();
  await expect(patternName(page)).toHaveValue("View B");
  await expect(slider(page, "Timeline view end")).toHaveAttribute("aria-valuenow", "600");
}

async function selectPattern(page: Page, name: string) {
  const patterns = page.getByRole("button", { name: "Patterns", exact: true });
  if ((await patterns.getAttribute("aria-pressed")) !== "true") await patterns.click();
  await page.getByRole("button", { name, exact: true }).click();
  await expect(patternName(page)).toHaveValue(name);
}

function audioFixture() {
  const sampleRate = 22050;
  const buffer = Buffer.alloc(44 + sampleRate * 2);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(buffer.length - 8, 4);
  buffer.write("WAVEfmt ", 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(sampleRate * 2, 40);
  for (let sample = 0; sample < sampleRate; sample++)
    buffer.writeInt16LE(
      Math.round(Math.sin((sample * 2 * Math.PI * 440) / sampleRate) * 8000),
      44 + sample * 2,
    );
  return { name: "view-state.wav", mimeType: "audio/wav", buffer };
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.routeWebSocket("**/relay?role=studio", (socket) =>
    socket.send(JSON.stringify({ type: "peers", phones: 0 })),
  );
});

test("the actual editor restores each preset view and cursor, then resets session state on reload", async ({
  page,
}) => {
  await page.goto("/");
  await expect(patternName(page)).toBeEditable();
  await patternName(page).fill("View A");
  await patternName(page).blur();
  await expect(slider(page, "Timeline view end")).toHaveAttribute("aria-valuenow", "300");
  await slider(page, "Scrub position").press("Shift+ArrowRight");
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await page.getByRole("button", { name: "Pan right", exact: true }).click();
  const first = await view(page);
  expect(first).toEqual({ start: 50, end: 250, cursor: 100 });

  await importSecondPattern(page);
  await slider(page, "Scrub position").press("Shift+ArrowRight");
  await slider(page, "Scrub position").press("Shift+ArrowRight");
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await page.getByRole("button", { name: "Pan right", exact: true }).click();
  const second = await view(page);
  expect(second).toEqual({ start: 100, end: 500, cursor: 200 });

  await selectPattern(page, "View A");
  expect(await view(page)).toEqual(first);
  await selectPattern(page, "View B");
  expect(await view(page)).toEqual(second);
  await selectPattern(page, "View A");
  expect(await view(page)).toEqual(first);
  await page.reload();
  await expect(patternName(page)).toHaveValue("View A");
  await expect(slider(page, "Timeline view end")).toHaveAttribute("aria-valuenow", "300");
  expect(await view(page)).toEqual({ start: 0, end: 300, cursor: 0 });
});

test("returning audio hydration creates a fresh URL without refitting the saved preset view", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const state = window as unknown as { __presetAudioUrls: string[] };
    state.__presetAudioUrls = [];
    const create = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (blob) => {
      const url = create(blob);
      if (blob instanceof File && blob.name === "view-state.wav") state.__presetAudioUrls.push(url);
      return url;
    };
  });
  await page.goto("/");
  await expect(patternName(page)).toBeEditable();
  await patternName(page).fill("Audio A");
  await patternName(page).blur();
  await page.getByRole("tab", { name: "sound", exact: true }).click();
  await page.getByLabel("Audio file", { exact: true }).setInputFiles(audioFixture());
  await expect(page.getByRole("img", { name: "Audio waveform", exact: true })).toBeVisible({
    timeout: 20000,
  });
  await expect
    .poll(async () => Number(await slider(page, "Timeline view end").getAttribute("aria-valuenow")))
    .toBeGreaterThan(300);
  await page.getByRole("tab", { name: "inspector", exact: true }).click();
  await slider(page, "Scrub position").press("Shift+ArrowRight");
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await page.getByRole("button", { name: "Pan right", exact: true }).click();
  const saved = await view(page);
  expect(saved.start).toBeGreaterThan(0);
  expect(saved.cursor).toBe(100);
  const urls = () =>
    page.evaluate(() => (window as unknown as { __presetAudioUrls: string[] }).__presetAudioUrls);
  const firstUrls = await urls();
  expect(firstUrls).toHaveLength(1);

  await importSecondPattern(page);
  await expect(page.locator(".timeline-panel")).toHaveAttribute("data-tracks", "1");
  await selectPattern(page, "Audio A");
  await expect(page.locator(".timeline-panel")).toHaveAttribute("data-tracks", "2");
  await expect.poll(async () => (await urls()).length).toBe(2);
  await page.getByRole("tab", { name: "sound", exact: true }).click();
  await expect(page.getByRole("img", { name: "Audio waveform", exact: true })).toBeVisible({
    timeout: 20000,
  });
  await expect(page.getByRole("region", { name: "Sound tools", exact: true })).toHaveAttribute(
    "aria-busy",
    "false",
  );
  expect(await view(page)).toEqual(saved);
  const hydratedUrls = await urls();
  expect(hydratedUrls[1]).not.toBe(firstUrls[0]);
  await page.screenshot({ path: "/tmp/buzzzz-cursor-ui-results/audio-hydrated-view.png" });
});
