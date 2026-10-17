import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { isPattern } from "@buzzzz/core";
import { unzipSync } from "fflate";

async function chooseSetting(page: Page, name: string, option: string) {
  await page.getByRole("button", { name, exact: true }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

test.beforeEach(async ({ page }) => {
  await page.routeWebSocket("**/relay?role=studio", (socket) =>
    socket.send(JSON.stringify({ type: "peers", phones: 0 })),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
});
for (const width of [320, 390, 768, 1024, 1440])
  test(`theme choices remain inside the settings panel at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    const chooser = page.getByRole("radiogroup", { name: "Appearance", exact: true });
    const bounds = await chooser.boundingBox();
    const options = await chooser.getByRole("radio").evaluateAll((buttons) =>
      buttons.map((button) => {
        const rect = button.getBoundingClientRect();
        return { left: rect.left, right: rect.right, width: rect.width };
      }),
    );
    expect(options).toHaveLength(3);
    for (const option of options) {
      expect(option.left).toBeGreaterThanOrEqual(bounds!.x);
      expect(option.right).toBeLessThanOrEqual(bounds!.x + bounds!.width);
    }
    await chooser.getByRole("radio", { name: "Dark", exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await chooser.getByRole("radio", { name: "Dark", exact: true }).press("ArrowLeft");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });

test("grid, crosshair, chart cursor and shared selection preferences work and persist", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  const chart = page.getByRole("group", { name: "Haptic pattern timeline", exact: true });
  const density = page.getByRole("button", { name: "Grid density", exact: true });
  await chooseSetting(page, "Grid density", "Off");
  await expect(chart.locator(".grid")).toHaveCount(0);
  await expect(chart.locator(".tick")).toHaveCount(0);
  await chooseSetting(page, "Grid density", "Sparse");
  const sparse = await chart.locator(".grid").count();
  await chooseSetting(page, "Grid density", "Normal");
  const normal = await chart.locator(".grid").count();
  await chooseSetting(page, "Grid density", "Dense");
  const dense = await chart.locator(".grid").count();
  expect(sparse).toBeGreaterThan(0);
  expect(normal).toBeGreaterThan(sparse);
  expect(dense).toBeGreaterThan(normal);
  await chart.hover({ position: { x: 100, y: 100 } });
  await expect(chart.locator(".chart-crosshair")).toHaveCount(1);
  const settings = page.locator(".settings-panel");
  await settings.getByRole("switch", { name: "Crosshair rails", exact: true }).uncheck();
  await chart.hover({ position: { x: 100, y: 100 } });
  await expect(chart.locator(".chart-crosshair")).toHaveCount(0);
  await settings.getByRole("switch", { name: "Time cursor", exact: true }).uncheck();
  await expect(chart.locator("[data-playhead]")).toHaveCount(0);
  await expect(page.getByRole("slider", { name: "Playback position", exact: true })).toHaveCount(1);
  await settings.getByRole("switch", { name: "Multilayer selection", exact: true }).uncheck();
  await expect(
    page
      .locator(".workspace-inspector")
      .getByRole("switch", { name: "Multilayer selection", exact: true }),
  ).not.toBeChecked();
  await chooseSetting(page, "Value precision", "0.01%");
  await page.reload();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(density).toHaveText("Dense");
  await expect(page.getByRole("button", { name: "Value precision", exact: true })).toHaveText(
    "0.01%",
  );
  await expect(
    settings.getByRole("switch", { name: "Crosshair rails", exact: true }),
  ).not.toBeChecked();
  await expect(
    settings.getByRole("switch", { name: "Time cursor", exact: true }),
  ).not.toBeChecked();
  await expect(
    settings.getByRole("switch", { name: "Multilayer selection", exact: true }),
  ).not.toBeChecked();
});
async function exportedPattern(page: Page) {
  const next = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export 1 pattern", exact: true }).click();
  const path = await (await next).path();
  if (!path) throw new Error("Missing pattern export");
  const files = unzipSync(new Uint8Array(await readFile(path)));
  const haptics = Object.entries(files).filter(([name]) => name.startsWith("haptics/"));
  expect(haptics).toHaveLength(1);
  const value: unknown = JSON.parse(new TextDecoder().decode(haptics[0]![1]));
  if (!isPattern(value)) throw new Error("Invalid exported pattern");
  return value;
}
test("precision changes affect new edits and preserve fine values in exports", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await chooseSetting(page, "Value precision", "0.01%");
  const chart = page.getByRole("group", { name: "Haptic pattern timeline", exact: true });
  await chart
    .getByRole("button", { name: /^Tap at/ })
    .first()
    .click();
  const intensity = page.getByRole("spinbutton", { name: "Selected intensity", exact: true });
  await intensity.fill("64.36");
  expect((await exportedPattern(page)).discretePattern[0].amplitude).toBe(0.6436);
  await chooseSetting(page, "Value precision", "1%");
  expect((await exportedPattern(page)).discretePattern[0].amplitude).toBe(0.6436);
  await intensity.fill("64.36");
  await expect(intensity).toHaveValue("64");
  expect((await exportedPattern(page)).discretePattern[0].amplitude).toBe(0.64);
  await chooseSetting(page, "Value precision", "0.1%");
  await intensity.fill("64.36");
  await expect(intensity).toHaveValue("64.4");
  expect((await exportedPattern(page)).discretePattern[0].amplitude).toBe(0.644);
});
