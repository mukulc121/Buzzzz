import { patternTitle } from "./fixtures/pattern-title";
import { expect, test, type Page } from "@playwright/test";
import { isProjectRecord } from "../../apps/studio/src/features/project/model";
import { insertLibraryPattern } from "../../apps/studio/src/features/presets/insertPattern";
import { readFileSync } from "node:fs";
import type { StudioPreset } from "../../apps/studio/src/features/presets/catalog";

const studioPresets: StudioPreset[] = JSON.parse(
  readFileSync("apps/studio/src/features/presets/data/pulsar-studio-presets.json", "utf8"),
);
import { patternEnd } from "@buzzzz/core";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("buzzzz.onboarding.seen", "true"));
  await page.routeWebSocket("**/relay?role=studio", (socket) =>
    socket.send(JSON.stringify({ type: "peers", phones: 0 })),
  );
});

async function openLibrary(page: Page) {
  await page.getByRole("button", { name: "Tools", exact: true }).click();
  await page.getByRole("button", { name: "Pulsar Library", exact: true }).click();
  return page.getByRole("region", { name: "Pulsar Library", exact: true });
}

async function project(page: Page) {
  const value: unknown = await page.evaluate(() => {
    const id = localStorage.getItem("buzzzz.lastProject");
    return JSON.parse(localStorage.getItem(`buzzzz.project.${id}`) ?? "null");
  });
  if (!isProjectRecord(value)) throw new Error("Missing saved project");
  return value.project;
}

test("library inspection is silent until Play and closing its preview stops playback", async ({
  page,
}) => {
  await page.goto("/");
  const initial = await project(page);
  const library = await openLibrary(page);
  await expect(library.getByText("151 of 151 presets", { exact: true })).toBeVisible();
  await library.getByRole("searchbox").fill("Thunder");
  await library.locator(".library-row-name").getByText("Thunder", { exact: true }).click();
  await expect(
    page.locator(".pattern-header").getByRole("button", { name: "Play", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await library.getByRole("button", { name: "About Thunder", exact: true }).click();
  const detail = page.getByRole("dialog", { name: "Thunder", exact: true });
  await expect(detail.getByRole("button", { name: "Play", exact: true })).toBeVisible();
  await expect(
    page.locator(".pattern-header").getByRole("button", { name: "Play", exact: true }),
  ).toBeVisible();
  await detail.getByRole("button", { name: "Play", exact: true }).click();
  await expect(detail.getByRole("button", { name: "Stop", exact: true })).toBeVisible();
  await expect(
    page.locator(".pattern-header").getByRole("button", { name: "Play", exact: true }),
  ).toBeVisible();
  const cursor = page.locator(".chart [data-playhead]");
  await expect(cursor).toHaveAttribute("aria-valuenow", "0");
  const positions = await cursor.evaluate(async (element) => {
    const samples: (string | null)[] = [];
    for (let frame = 0; frame < 20; frame++) {
      await new Promise(requestAnimationFrame);
      samples.push(element.getAttribute("aria-valuenow"));
    }
    return samples;
  });
  expect(new Set(positions)).toEqual(new Set(["0"]));
  await detail.getByRole("button", { name: "Close", exact: true }).click();
  await expect(detail).not.toBeVisible();
  await expect(
    page.locator(".pattern-header").getByRole("button", { name: "Play", exact: true }),
  ).toBeVisible();
  expect(await project(page)).toEqual(initial);
});

test("library audition leaves an attached animation paused on its current frame", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("tab", { name: "animation", exact: true }).click();
  await page
    .getByLabel("Lottie file", { exact: true })
    .setInputFiles("apps/preview/src/features/demos/lottie/bounce.json");
  const preview = page.getByRole("region", { name: "Animation canvas preview", exact: true });
  const canvas = preview.locator("canvas");
  await expect(canvas).toBeVisible({ timeout: 20000 });
  const library = await openLibrary(page);
  await library.getByRole("searchbox").fill("Thunder");
  await library.getByRole("button", { name: "About Thunder", exact: true }).click();
  const detail = page.getByRole("dialog", { name: "Thunder", exact: true });
  const before = await canvas.evaluate((element) => {
    if (!(element instanceof HTMLCanvasElement)) throw new Error("Missing animation canvas");
    return element.toDataURL();
  });
  await detail.getByRole("button", { name: "Play", exact: true }).click();
  await expect(detail.getByRole("button", { name: "Stop", exact: true })).toBeVisible();
  const frames = await canvas.evaluate(async (element) => {
    if (!(element instanceof HTMLCanvasElement)) throw new Error("Missing animation canvas");
    const samples: string[] = [];
    for (let frame = 0; frame < 20; frame++) {
      await new Promise(requestAnimationFrame);
      samples.push(element.toDataURL());
    }
    return samples;
  });
  expect(new Set(frames)).toEqual(new Set([before]));
  await expect(preview.getByRole("button", { name: "Play animation", exact: true })).toBeVisible();
  await expect(
    page.locator(".pattern-header").getByRole("button", { name: "Play", exact: true }),
  ).toBeVisible();
  await detail.getByRole("button", { name: "Close", exact: true }).click();
});

test("starting a library audition stops an existing editor playback clock", async ({ page }) => {
  await page.goto("/");
  await expect(patternTitle(page)).toBeVisible();
  await page.evaluate(() => {
    const transfer = new DataTransfer();
    transfer.items.add(
      new File(
        [
          JSON.stringify({
            continuousPattern: {
              amplitude: [
                { time: 0, value: 0.5 },
                { time: 20000, value: 0.5 },
              ],
              frequency: [
                { time: 0, value: 0.5 },
                { time: 20000, value: 0.5 },
              ],
            },
            discretePattern: [],
          }),
        ],
        "long-pattern.json",
        { type: "application/json" },
      ),
    );
    document
      .querySelector(".shell")!
      .dispatchEvent(
        new DragEvent("drop", { dataTransfer: transfer, bubbles: true, cancelable: true }),
      );
  });
  await expect(patternTitle(page)).toHaveText("long-pattern");
  const editor = page.locator(".pattern-header");
  await editor.getByRole("button", { name: "Play", exact: true }).click();
  await expect(editor.getByRole("button", { name: "Stop", exact: true })).toBeVisible();
  const library = await openLibrary(page);
  await library.getByRole("searchbox").fill("Thunder");
  await library.getByRole("button", { name: "About Thunder", exact: true }).click();
  const detail = page.getByRole("dialog", { name: "Thunder", exact: true });
  await detail.getByRole("button", { name: "Play", exact: true }).click();
  await expect(detail.getByRole("button", { name: "Stop", exact: true })).toBeVisible();
  await expect(editor.getByRole("button", { name: "Play", exact: true })).toBeVisible();
  await expect(page.locator(".chart [data-playhead]")).toHaveAttribute("aria-valuenow", "0");
  await detail.getByRole("button", { name: "Close", exact: true }).click();
  await expect(editor.getByRole("button", { name: "Play", exact: true })).toBeVisible();
});

test("append and detail insertion update the active pattern, persist and undo", async ({
  page,
}) => {
  await page.goto("/");
  const initial = await project(page);
  const active = initial.presets[0];
  const alarm = studioPresets.find((entry) => entry.id === "alarm");
  if (!active || !alarm) throw new Error("Missing test pattern");
  const library = await openLibrary(page);
  await library.getByRole("searchbox").fill("alarm");
  await library.getByRole("button", { name: "Append Alarm to the pattern", exact: true }).click();
  const expected = insertLibraryPattern(active.pattern, alarm.pattern, patternEnd(active.pattern));
  await expect.poll(async () => (await project(page)).presets[0]?.pattern).toEqual(expected);
  await expect(patternTitle(page)).toHaveText("Thud");
  expect((await project(page)).presets).toHaveLength(1);
  await page.keyboard.press("Control+z");
  await expect.poll(async () => (await project(page)).presets[0]?.pattern).toEqual(active.pattern);
  await library.getByRole("button", { name: "About Alarm", exact: true }).click();
  await page
    .getByRole("dialog", { name: "Alarm", exact: true })
    .getByRole("button", { name: "Add to preset", exact: true })
    .click();
  await expect.poll(async () => (await project(page)).presets[0]?.pattern).toEqual(expected);
  await page.reload();
  expect((await project(page)).presets[0]?.pattern).toEqual(expected);
  await expect(patternTitle(page)).toHaveText("Thud");
});

test("the floating library persists across panels, moves, resizes and docks", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await openLibrary(page);
  await page.getByRole("button", { name: "Open in window", exact: true }).click();
  const tool = page.getByRole("dialog", { name: "Pulsar Library tool window", exact: true });
  await expect(tool).toBeVisible();
  const initial = await tool.boundingBox();
  if (!initial) throw new Error("Missing tool bounds");
  expect(initial).toMatchObject({ x: 980, y: 80, width: 380, height: 480 });
  await page.getByRole("button", { name: "Patterns", exact: true }).click();
  await expect(tool).toBeVisible();
  const header = await tool.locator("header").boundingBox();
  if (!header) throw new Error("Missing tool header");
  await page.mouse.move(header.x + 60, header.y + header.height / 2);
  await page.mouse.down();
  await page.mouse.move(header.x - 40, header.y + header.height / 2 + 50, { steps: 4 });
  await page.mouse.up();
  const moved = await tool.boundingBox();
  expect(moved?.x).toBe(initial.x - 100);
  expect(moved?.y).toBe(initial.y + 50);
  await tool.getByRole("separator", { name: "Resize window", exact: true }).focus();
  await page.keyboard.press("Shift+ArrowRight");
  await page.keyboard.press("Shift+ArrowDown");
  const resized = await tool.boundingBox();
  expect(resized?.width).toBe(initial.width + 50);
  expect(resized?.height).toBe(initial.height + 50);
  await tool.getByRole("button", { name: "Dock to panel", exact: true }).click();
  await expect(tool).not.toBeVisible();
  await expect(page.getByRole("region", { name: "Pulsar Library", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Open in window", exact: true }).click();
  await tool.getByRole("button", { name: "Close window", exact: true }).click();
  await expect(tool).not.toBeVisible();
});

test("library drag places a pattern at the chart timestamp and remains undoable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  const initial = await project(page);
  const active = initial.presets[0];
  const afterglow = studioPresets.find((entry) => entry.id === "afterglow");
  if (!active || !afterglow) throw new Error("Missing test pattern");
  const library = await openLibrary(page);
  await library.getByRole("searchbox").fill("afterglow");
  const chart = page.getByRole("group", { name: "Haptic pattern timeline", exact: true });
  const rect = await chart.boundingBox();
  if (!rect) throw new Error("Missing chart");
  const viewEnd = page.getByRole("slider", { name: "Timeline view end", exact: true });
  const timestamp = Math.round(Number(await viewEnd.getAttribute("aria-valuenow")) / 2);
  const plot = chart.locator("clipPath rect");
  const left = Number(await plot.getAttribute("x")) + 14;
  const axisWidth = Number(await plot.getAttribute("width")) - 28;
  await library
    .locator(".library-row")
    .dragTo(chart, { targetPosition: { x: left + axisWidth / 2, y: rect.height / 2 } });
  await expect
    .poll(async () => (await project(page)).presets[0]?.pattern)
    .not.toEqual(active.pattern);
  const updated = (await project(page)).presets[0]?.pattern;
  if (!updated) throw new Error("Missing dropped pattern");
  const inserted = updated.discretePattern.find((point) => point.time > 0);
  expect(inserted?.time).toBe(timestamp);
  expect(updated).toEqual(insertLibraryPattern(active.pattern, afterglow.pattern, timestamp));
  await chart.focus();
  await page.keyboard.press("Control+z");
  await expect.poll(async () => (await project(page)).presets[0]?.pattern).toEqual(active.pattern);
});

for (const theme of ["Light", "Dark"]) {
  test(`${theme} library dialogs and windows fit every supported sidebar width`, async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await page.getByRole("radio", { name: theme, exact: true }).click();
    for (const width of [320, 900, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      const library = await openLibrary(page);
      expect(await library.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
        true,
      );
      await library.getByRole("button", { name: "About Afterglow", exact: true }).click();
      const detail = page.getByRole("dialog", { name: "Afterglow", exact: true });
      expect(
        await detail.evaluate((element) => {
          const bounds = element.getBoundingClientRect();
          return bounds.left >= 0 && bounds.right <= innerWidth;
        }),
      ).toBe(true);
      await detail.getByRole("button", { name: "Close", exact: true }).click();
      await page.getByRole("button", { name: "Open in window", exact: true }).click();
      const tool = page.getByRole("dialog", { name: "Pulsar Library tool window", exact: true });
      expect(
        await tool.evaluate((element) => {
          const bounds = element.getBoundingClientRect();
          return bounds.left >= 0 && bounds.right <= innerWidth;
        }),
      ).toBe(true);
      await tool.getByRole("button", { name: "Close window", exact: true }).click();
      await page.getByRole("button", { name: "Patterns", exact: true }).click();
    }
  });
}
