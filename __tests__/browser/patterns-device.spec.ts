import { patternTitle } from "./fixtures/pattern-title";
import { readFile } from "node:fs/promises";
import { expect, test, type WebSocketRoute } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.routeWebSocket("**/relay?role=studio", (socket) =>
    socket.send(JSON.stringify({ type: "peers", phones: 0 })),
  );
  await page.goto("/");
});

test("patterns show duration and events, duplicate/delete through row actions, and export/import remains reachable", async ({
  page,
}) => {
  const patterns = page.getByRole("complementary", { name: "Project patterns", exact: true });
  await expect(patterns.getByRole("button", { name: "Thud", exact: true })).toContainText(
    "300 ms · 1 discrete",
  );
  await patterns.getByRole("button", { name: "Thud", exact: true }).click({ button: "right" });
  await page.getByRole("menuitem", { name: "Duplicate", exact: true }).click();
  await expect(patternTitle(page)).toHaveText("Thud copy");
  await patterns.getByRole("button", { name: "Thud copy", exact: true }).click({ button: "right" });
  await page.getByRole("menuitem", { name: "Remove", exact: true }).click();
  await expect(patterns.getByRole("button", { name: "Thud copy", exact: true })).toHaveCount(0);
  await patterns.getByRole("button", { name: "New pattern", exact: true }).click();
  const rename = page.getByRole("textbox", { name: "Pattern name", exact: true });
  await expect(rename).toHaveValue("Untitled pattern");
  await rename.press("Enter");
  const exports = page.locator('[data-tour="inspector-export"]');
  await exports.locator("summary").click();
  await exports.getByRole("button", { name: "Clear all", exact: true }).click();
  await exports.getByRole("checkbox", { name: "Untitled pattern", exact: true }).click();
  const waiting = page.waitForEvent("download");
  await exports.getByRole("button", { name: "Export 1 pattern", exact: true }).click();
  const download = await waiting;
  expect(download.suggestedFilename()).toBe("untitled-pattern.pulsar");
  const path = await download.path();
  if (!path) throw new Error("Missing exported project archive");
  const buffer = await readFile(path);
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await page.locator('.project-dashboard input[type="file"]').setInputFiles({
    name: "untitled-pattern.pulsar",
    mimeType: "application/octet-stream",
    buffer,
  });
  await expect(patternTitle(page)).toHaveText("Untitled pattern");
  await expect(patterns.locator(".pattern-select")).toHaveCount(1);
});

test("a paired phone closes the dialog and another phone can join", async ({ page }) => {
  let relay: WebSocketRoute | null = null;
  await page.routeWebSocket("**/relay?role=studio", (socket) => {
    relay = socket;
    socket.send(JSON.stringify({ type: "peers", phones: 0 }));
  });
  await page.reload();
  await page.getByRole("button", { name: "Device", exact: true }).click();
  await page.getByRole("button", { name: "Connect device", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Connect device", exact: true });
  await expect(dialog.locator(".qr")).toBeVisible();
  await expect.poll(() => relay !== null).toBe(true);
  relay!.send(JSON.stringify({ type: "peers", phones: 1 }));
  await expect(dialog).toHaveCount(0);
  await expect(page.getByText("1 connected", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Pair another phone", exact: true }).click();
  await expect(dialog.locator(".qr")).toBeVisible();
  relay!.send(JSON.stringify({ type: "peers", phones: 2 }));
  await expect(dialog).toHaveCount(0);
  await expect(page.getByText("2 connected", { exact: true })).toBeVisible();
});

for (const width of [320, 390, 1440])
  test(`device pairing is explicit, accessible and fits at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.getByRole("button", { name: "Device", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "No device connected", exact: true }),
    ).toBeVisible();
    await expect(page.locator(".qr")).toHaveCount(0);
    await page.getByRole("button", { name: "Connect device", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Connect device", exact: true });
    await expect(dialog.locator(".qr")).toBeVisible();
    await expect(dialog.getByRole("textbox", { name: "Relay address", exact: true })).toHaveValue(
      /^ws:\/\/.+\/relay$/,
    );
    const { default: AxeBuilder } = await import("@axe-core/playwright");
    const scan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(scan.violations).toEqual([]);
    const bounds = await dialog.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await page.getByRole("button", { name: "Don't have Buzzzz Preview?", exact: true }).click();
    await expect(
      page.getByRole("dialog", { name: "Get Buzzzz Preview", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Open the phone setup guide", exact: true }),
    ).toHaveAttribute("href", "https://github.com/mukulc121/Buzzzz#preview-on-a-phone");
  });
