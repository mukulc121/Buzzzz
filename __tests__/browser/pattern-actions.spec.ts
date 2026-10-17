import { patternTitle } from "./fixtures/pattern-title";
import { expect, test, type Page } from "@playwright/test";
import type { Project } from "@buzzzz/core";
import type { IMediaAttachment, IMediaItem } from "../../apps/studio/src/features/media/model";

async function storedProject(page: Page) {
  return page.evaluate(() => {
    const id = localStorage.getItem("buzzzz.lastProject");
    const record: { project: Project } = JSON.parse(
      localStorage.getItem(`buzzzz.project.${id}`) ?? "null",
    );
    return record.project;
  });
}

async function storedMedia(page: Page, presetId: string) {
  return page.evaluate(async (presetId) => {
    const projectId = localStorage.getItem("buzzzz.lastProject");
    const path = "/src/features/media/repository.ts";
    const media = await import(path);
    const attachments: IMediaAttachment[] = await media.listAttachments(projectId, presetId);
    const items: IMediaItem[] = await media.listMedia(projectId);
    return { attachments, items };
  }, presetId);
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("buzzzz.onboarding.seen", "true"));
  await page.routeWebSocket("**/relay?role=studio", (socket) =>
    socket.send(JSON.stringify({ type: "peers", phones: 0 })),
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await expect(patternTitle(page)).toBeVisible();
});

test("New creates the source 100 ms preset and immediately selects its inline name for editing", async ({
  page,
}) => {
  const panel = page.getByRole("complementary", { name: "Project patterns", exact: true });
  await panel.getByRole("button", { name: "New pattern", exact: true }).click();
  const rename = page.getByRole("textbox", { name: "Pattern name", exact: true });
  await expect(rename).toBeFocused();
  expect(
    await rename.evaluate((node: HTMLInputElement) => [node.selectionStart, node.selectionEnd]),
  ).toEqual([0, "Untitled pattern".length]);
  await rename.fill("New tap");
  await rename.press("Enter");
  await expect(panel.getByRole("button", { name: "New tap", exact: true })).toContainText(
    "100 ms · 0 discrete",
  );
  await page.reload();
  await expect(panel.getByRole("button", { name: "New tap", exact: true })).toContainText(
    "100 ms · 0 discrete",
  );
});

test("Duplicate resets the cursor and keeps the range, original audio trim and animation attachments", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await page
    .locator(".project-dashboard-header")
    .getByRole("button", { name: "Create sample project", exact: true })
    .click();
  const patterns = page.getByRole("complementary", { name: "Project patterns", exact: true });
  await patterns.getByRole("button", { name: "FanfareSound", exact: true }).click();
  await page.getByRole("tab", { name: "sound", exact: true }).click();
  await page.getByRole("button", { name: "Open trimming tool", exact: true }).click();
  const trim = page.getByRole("dialog", { name: "Audio trim", exact: true });
  await trim.getByRole("spinbutton", { name: "Start", exact: true }).fill("500");
  await trim.getByRole("spinbutton", { name: "End", exact: true }).fill("4000");
  await trim.getByRole("button", { name: "Apply trim", exact: true }).click();
  await page.getByRole("tab", { name: "inspector", exact: true }).click();
  await page.getByRole("spinbutton", { name: "Playback range start", exact: true }).fill("200");
  await page.getByRole("spinbutton", { name: "Playback range end", exact: true }).fill("3000");
  await page.getByRole("switch", { name: "Loop", exact: true }).check();
  const cursor = page.getByRole("slider", { name: "Scrub position", exact: true });
  for (let step = 0; step < 10; step++) await cursor.press("Shift+ArrowRight");
  await expect(cursor).toHaveAttribute("aria-valuenow", "1000");
  await page.getByRole("button", { name: "Add marker at the cursor", exact: true }).click();
  await page.getByRole("textbox", { name: "Marker label", exact: true }).fill("Hit");
  await page.getByRole("spinbutton", { name: "Marker time", exact: true }).fill("1000");
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  const source = (await storedProject(page)).presets.find(
    (preset) => preset.name === "FanfareSound",
  );
  if (!source?.editor) throw new Error("Missing source editor");
  await patterns
    .getByRole("button", { name: "FanfareSound", exact: true })
    .click({ button: "right" });
  await page.getByRole("menuitem", { name: "Duplicate", exact: true }).click();
  await expect(patternTitle(page)).toHaveText("FanfareSound copy");
  await expect(cursor).toHaveAttribute("aria-valuenow", "0");
  await expect(
    page.getByRole("slider", { name: "Timeline view start", exact: true }),
  ).toHaveAttribute("aria-valuenow", "0");
  await expect(
    page.getByRole("slider", { name: "Timeline view end", exact: true }),
  ).toHaveAttribute("aria-valuenow", String(source.editor.durationMs));
  await expect(
    page.getByRole("spinbutton", { name: "Playback range start", exact: true }),
  ).toHaveValue("200");
  await expect(
    page.getByRole("spinbutton", { name: "Playback range end", exact: true }),
  ).toHaveValue("3000");
  await expect(page.getByRole("switch", { name: "Loop", exact: true })).toBeChecked();
  const project = await storedProject(page);
  const copy = project.presets.find((preset) => preset.name === "FanfareSound copy");
  if (!copy?.editor) throw new Error("Missing copied editor");
  expect(copy.pattern).toEqual(source.pattern);
  expect(copy.editor).toEqual({
    ...source.editor,
    markers: [{ ...source.editor.markers[0], id: copy.editor.markers[0].id }],
  });
  expect(copy.editor.markers[0].id).not.toBe(source.editor.markers[0].id);
  expect(project.presets.find((preset) => preset.id === source.id)).toEqual(source);
  const originalMedia = await storedMedia(page, source.id);
  const copiedMedia = await storedMedia(page, copy.id);
  expect(copiedMedia.items).toHaveLength(2);
  expect(copiedMedia.attachments.map(({ assetId, trim }) => ({ assetId, trim }))).toEqual(
    originalMedia.attachments.map(({ assetId, trim }) => ({ assetId, trim })),
  );
  expect(copiedMedia.attachments[0].trim).toEqual({ startMs: 500, endMs: 4000 });
  await page.getByRole("tab", { name: "sound", exact: true }).click();
  await expect(page.getByRole("tabpanel", { name: "sound", exact: true })).toContainText(
    "fanfaresound.mp3",
  );
  await page.getByRole("button", { name: "Open trimming tool", exact: true }).click();
  await expect(trim.getByRole("spinbutton", { name: "Start", exact: true })).toHaveValue("500");
  await expect(trim.getByRole("spinbutton", { name: "End", exact: true })).toHaveValue("4000");
  await trim.getByRole("button", { name: "Close audio trim", exact: true }).click();
  await patterns
    .getByRole("button", { name: "ExplosionAnimation", exact: true })
    .click({ button: "right" });
  await page.getByRole("menuitem", { name: "Duplicate", exact: true }).click();
  await expect(patternTitle(page)).toHaveText("ExplosionAnimation copy");
  await page.getByRole("tab", { name: "animation", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Animation canvas preview", exact: true }).locator("canvas"),
  ).toBeVisible();
  const animations = (await storedProject(page)).presets.filter((preset) =>
    preset.name.startsWith("ExplosionAnimation"),
  );
  const originalAnimation = await storedMedia(page, animations[0].id);
  const copiedAnimation = await storedMedia(page, animations[1].id);
  expect(copiedAnimation.items).toHaveLength(2);
  expect(copiedAnimation.attachments[0].assetId).toBe(originalAnimation.attachments[0].assetId);
  await page.reload();
  await expect(
    patterns.getByRole("button", { name: "ExplosionAnimation copy", exact: true }),
  ).toBeVisible();
  expect((await storedMedia(page, copy.id)).attachments[0].trim).toEqual({
    startMs: 500,
    endMs: 4000,
  });
});
