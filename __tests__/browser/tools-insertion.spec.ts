import { patternTitle } from "./fixtures/pattern-title";
import { expect, test, type Page } from "@playwright/test";
import { isProjectRecord } from "../../apps/studio/src/features/project/model";
import type { Project } from "@buzzzz/core";

const target: Project = {
  presets: [
    {
      id: "tool-target",
      name: "Tool target",
      pattern: {
        continuousPattern: {
          amplitude: [
            { time: 0, value: 0.2 },
            { time: 1000, value: 0.8 },
            { time: 2000, value: 0 },
          ],
          frequency: [
            { time: 0, value: 0.3 },
            { time: 2000, value: 0.6 },
          ],
        },
        discretePattern: [
          { time: 100, amplitude: 0.3, frequency: 0.4 },
          { time: 700, amplitude: 0.5, frequency: 0.6 },
        ],
      },
    },
  ],
  map: {},
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("buzzzz.onboarding.seen", "true");
    localStorage.setItem("buzzzz.mobile-notice-dismissed", "1");
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
});

async function project(page: Page) {
  const value: unknown = await page.evaluate(() => {
    const id = localStorage.getItem("buzzzz.lastProject");
    return JSON.parse(localStorage.getItem(`buzzzz.project.${id}`) ?? "null");
  });
  if (!isProjectRecord(value)) throw new Error("Missing saved project");
  return value.project;
}

async function loadTarget(page: Page, data = target) {
  await page.addInitScript((project) => {
    const key = "buzzzz.project.tools-insertion";
    if (localStorage.getItem(key)) return;
    const now = Date.now();
    localStorage.setItem(
      key,
      JSON.stringify({
        id: "tools-insertion",
        name: "Tool insertion",
        createdAt: now,
        updatedAt: now,
        revision: 0,
        project,
      }),
    );
    localStorage.setItem("buzzzz.lastProject", "tools-insertion");
  }, data);
  await page.goto("/studio/projects/tools-insertion");
  await expect(patternTitle(page)).toHaveText("Tool target");
}

async function openTool(page: Page, name: string) {
  await page.getByRole("button", { name: "Tools", exact: true }).click();
  await page.getByRole("button", { name, exact: true }).click();
  return page.getByRole("region", { name, exact: true });
}

test("tap rhythm inserts at zero in the active pattern, preserving envelopes, cursor and undo", async ({
  page,
}) => {
  const data = structuredClone(target);
  data.presets[0].pattern.discretePattern.push({ time: 59000, amplitude: 0.1, frequency: 0.2 });
  await loadTarget(page, data);
  const before = await project(page);
  const cursor = page.locator(".chart [data-playhead]");
  await cursor.focus();
  await cursor.press("ArrowRight");
  const position = await cursor.getAttribute("aria-valuenow");
  expect(Number(position)).toBeGreaterThan(0);
  const rhythm = await openTool(page, "Tap Rhythm");
  const pad = rhythm.getByRole("button", {
    name: "Tap pad - tap in time with the rhythm",
    exact: true,
  });
  await pad.click();
  await pad.dispatchEvent("keydown", { key: " ", code: "Space", repeat: true });
  await expect(pad).toContainText("1 tap");
  await pad.press("Space");
  await pad.press("Enter");
  await expect(pad).toContainText("3 taps");
  expect(await project(page)).toEqual(before);
  await rhythm.getByRole("button", { name: "Generate events", exact: true }).click();
  await expect
    .poll(
      async () =>
        (await project(page)).presets[0].pattern.discretePattern.filter(
          (tap) => tap.amplitude === 0.8 && tap.frequency === 0.5,
        ).length,
    )
    .toBe(3);
  const after = await project(page);
  expect(after.presets).toHaveLength(before.presets.length);
  expect(after.presets[0].name).toBe("Tool target");
  expect(after.presets[0].pattern.continuousPattern).toEqual(
    before.presets[0].pattern.continuousPattern,
  );
  expect(after.presets[0].pattern.discretePattern[0]).toEqual({
    time: 0,
    amplitude: 0.8,
    frequency: 0.5,
  });
  expect(after.presets[0].pattern.discretePattern).toContainEqual({
    time: 59000,
    amplitude: 0.1,
    frequency: 0.2,
  });
  await expect(cursor).toHaveAttribute("aria-valuenow", position ?? "");
  await page.keyboard.press("Control+z");
  await expect.poll(() => project(page)).toEqual(before);
});

test("snippet append and detail insert update the same pattern at its end and survive reload", async ({
  page,
}) => {
  await loadTarget(page);
  const before = await project(page);
  const snippets = await openTool(page, "Snippets");
  await snippets.getByRole("textbox", { name: "Snippet name", exact: true }).fill("Pulse");
  await snippets.getByRole("spinbutton", { name: "Snippet end", exact: true }).fill("200");
  await snippets.getByRole("button", { name: "Save range as snippet", exact: true }).click();
  expect(await project(page)).toEqual(before);
  const row = snippets.locator(".library-row");
  await row.click({ button: "right" });
  await page.getByRole("menuitem", { name: "Rename", exact: true }).click();
  const rename = snippets.locator(".library-row input");
  await rename.fill("Renamed pulse");
  await rename.press("Enter");
  await snippets
    .getByRole("button", { name: "Append Renamed pulse to the pattern", exact: true })
    .click();
  await expect
    .poll(async () => (await project(page)).presets[0].pattern.discretePattern)
    .toContainEqual({ time: 2100, amplitude: 0.3, frequency: 0.4 });
  expect((await project(page)).presets).toHaveLength(before.presets.length);
  await page.keyboard.press("Control+z");
  await expect.poll(() => project(page)).toEqual(before);
  await snippets.getByRole("button", { name: "About Renamed pulse", exact: true }).click();
  const detail = page.getByRole("dialog", { name: "Renamed pulse", exact: true });
  await expect(detail.getByRole("button", { name: "Play", exact: true })).toBeVisible();
  expect(await project(page)).toEqual(before);
  await detail.getByRole("button", { name: "Add to preset", exact: true }).click();
  await expect
    .poll(async () => (await project(page)).presets[0].pattern.discretePattern)
    .toContainEqual({ time: 2100, amplitude: 0.3, frequency: 0.4 });
  await page.reload();
  expect((await project(page)).presets).toHaveLength(before.presets.length);
  expect((await project(page)).presets[0].pattern.discretePattern).toContainEqual({
    time: 2100,
    amplitude: 0.3,
    frequency: 0.4,
  });
  const restored = await openTool(page, "Snippets");
  await expect(
    restored.getByRole("button", { name: "Append Renamed pulse to the pattern", exact: true }),
  ).toBeVisible();
});
