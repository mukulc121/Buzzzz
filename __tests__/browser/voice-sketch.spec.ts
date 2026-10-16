import { expect, test, type Page } from "@playwright/test";
import { isProjectRecord } from "../../apps/studio/src/features/project/model";

test.use({
  permissions: ["microphone"],
  launchOptions: { args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] },
});

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("buzzzz.onboarding.seen", "true"));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await expect(page.getByRole("textbox", { name: "Pattern name", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Tools", exact: true }).click();
  await page.getByRole("button", { name: "Voice Sketch", exact: true }).click();
});

async function savedProject(page: Page) {
  const value: unknown = await page.evaluate(() => {
    const id = localStorage.getItem("buzzzz.lastProject");
    return JSON.parse(localStorage.getItem(`buzzzz.project.${id}`) ?? "null");
  });
  if (!isProjectRecord(value)) throw new Error("Missing project record");
  return value.project;
}

test("voice take uses source controls and inserts at zero in the open pattern", async ({
  page,
}) => {
  const tool = page.getByRole("region", { name: "Voice Sketch", exact: true });
  const before = await savedProject(page);
  await expect(tool.getByRole("button", { name: "Start recording", exact: true })).toContainText(
    "Tap to record",
  );
  expect(await tool.getByRole("button").allTextContents()).toHaveLength(1);
  await tool.getByRole("button", { name: "Start recording", exact: true }).click();
  const stop = tool.getByRole("button", { name: "Stop recording", exact: true });
  await expect(stop).toContainText("s - tap to stop");
  await expect
    .poll(async () => Number((await stop.textContent())?.match(/[\d.]+/)?.[0]))
    .toBeGreaterThan(0.8);
  await stop.click();
  await expect(tool.getByRole("img", { name: "Preview of the recorded envelope" })).toBeVisible();
  await expect(tool.getByRole("heading", { name: "Take", exact: true })).toBeVisible();
  await expect(tool.getByRole("heading", { name: "Shape", exact: true })).toBeVisible();
  await expect(tool.getByRole("spinbutton", { name: "Smoothing", exact: true })).toHaveValue("90");
  await expect(tool.getByRole("spinbutton", { name: "Noise floor", exact: true })).toHaveValue(
    "-45",
  );
  await expect(tool.getByRole("spinbutton", { name: "Punch", exact: true })).toHaveValue("0.30");
  await tool.getByRole("button", { name: "Frequency source", exact: true }).click();
  await tool.getByRole("option", { name: "Brightness", exact: true }).click();
  await tool.getByRole("switch", { name: "Accent the attacks", exact: true }).uncheck();
  expect(await savedProject(page)).toEqual(before);
  await tool.getByRole("button", { name: "Generate pattern", exact: true }).click();
  await expect
    .poll(async () => (await savedProject(page)).presets[0].pattern)
    .not.toEqual(before.presets[0].pattern);
  const after = await savedProject(page);
  expect(after.presets).toHaveLength(before.presets.length);
  expect(after.presets[0].name).toBe(before.presets[0].name);
  expect(after.presets[0].pattern.continuousPattern.amplitude[0].time).toBe(0);
  await page.keyboard.press("Control+z");
  await expect.poll(() => savedProject(page)).toEqual(before);
  await tool.getByRole("button", { name: "Discard", exact: true }).click();
  await expect(tool.getByRole("button", { name: "Start recording", exact: true })).toContainText(
    "Tap to record",
  );
  await expect(tool.getByRole("heading", { name: "Take", exact: true })).toHaveCount(0);
});

test("blocked microphone shows the source error inline", async ({ page }) => {
  await page.evaluate(() => {
    navigator.mediaDevices.getUserMedia = () =>
      Promise.reject(new DOMException("Denied", "NotAllowedError"));
  });
  const tool = page.getByRole("region", { name: "Voice Sketch", exact: true });
  await tool.getByRole("button", { name: "Start recording", exact: true }).click();
  await expect(tool.getByRole("alert")).toHaveText(
    "Microphone access was blocked. Allow it for this site and try again.",
  );
  await expect(tool.getByRole("button", { name: "Start recording", exact: true })).toBeEnabled();
});
