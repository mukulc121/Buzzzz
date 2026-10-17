import { patternTitle } from "./fixtures/pattern-title";
import { expect, test } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.routeWebSocket("**/relay?role=studio", (socket) =>
    socket.send(JSON.stringify({ type: "peers", phones: 0 })),
  );
});

for (const width of [320, 375, 390, 700, 768, 1024, 1180, 1280, 1440, 1920]) {
  test(`workspace and pairing fit at ${width}px`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(page.getByRole("group", { name: "Haptic pattern timeline" })).toBeVisible();
    await expect(patternTitle(page)).toHaveText("Thud");
    const overflow = () =>
      page.evaluate(() => ({
        page: document.documentElement.scrollWidth > innerWidth,
        content: Array.from(
          document.querySelectorAll(
            "main,.workspace-sidebar,.workspace-inspector,.chart-card,.files",
          ),
        )
          .filter((element) => {
            const rect = element.getBoundingClientRect();
            return rect.left < -1 || rect.right > innerWidth + 1;
          })
          .map((element) => element.className),
      }));
    expect(await overflow()).toEqual({ page: false, content: [] });
    await expect(page.getByRole("button", { name: "New pattern", exact: true })).toBeInViewport();
    const layers = page.locator(".inspector-layers");
    await layers.scrollIntoViewIfNeeded();
    const bounds = () =>
      layers.locator(".inspector-layer").evaluateAll((rows) =>
        rows.map((row) => {
          const { x, y, width, height } = row.getBoundingClientRect();
          return { x, y, width, height };
        }),
      );
    const initial = await bounds();
    for (const name of ["Edit frequency", "Edit discrete", "Edit intensity"]) {
      await layers.getByRole("radio", { name, exact: true }).check();
      expect(await bounds()).toEqual(initial);
    }
    await page.getByRole("button", { name: "Device", exact: true }).click();
    await page.getByRole("button", { name: "Connect device", exact: true }).click();
    await expect(page.locator(".qr")).toBeVisible();
    const address = page.getByRole("textbox", { name: "Relay address", exact: true });
    await expect(address).toHaveValue(/^ws:\/\/.+\/relay$/);
    expect(await overflow()).toEqual({ page: false, content: [] });
    await page.keyboard.press("Escape");
    const chart = page.getByRole("group", { name: "Haptic pattern timeline", exact: true });
    const pointCount = await chart.getByRole("button").count();
    await page.getByRole("button", { name: "Tools", exact: true }).click();
    await page.getByRole("button", { name: "Pulsar library" }).click();
    await page.getByRole("searchbox", { name: "Search Pulsar presets" }).fill("alarm");
    await page.getByRole("button", { name: "Append Alarm to the pattern", exact: true }).click();
    await expect(patternTitle(page)).toHaveText("Thud");
    await expect.poll(() => chart.getByRole("button").count()).toBeGreaterThan(pointCount);
    expect(errors).toEqual([]);
  });
}

test("patterns persist, undo/redo works and malformed imports leave the project intact", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "New pattern", exact: true }).click();
  const rename = page.getByRole("textbox", { name: "Pattern name", exact: true });
  await rename.fill("Browser check");
  await rename.press("Enter");
  await page.reload();
  await expect(page.getByRole("button", { name: "Browser check", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "New pattern", exact: true }).click();
  await rename.press("Escape");
  await page.keyboard.press("Control+z");
  await expect(patternTitle(page)).toHaveText("Thud");
  await page.keyboard.press("Control+Shift+z");
  await expect(patternTitle(page)).toHaveText("Untitled pattern");
  await expect(page.getByRole("button", { name: "New pattern", exact: true })).toBeEnabled();
  const savedProject = () =>
    page.evaluate(() => {
      const id = localStorage.getItem("buzzzz.lastProject");
      return localStorage.getItem(`buzzzz.project.${id}`);
    });
  const before = await savedProject();
  const transfer = await page.evaluateHandle(() => {
    const files = new DataTransfer();
    files.items.add(new File(['{"presets":[{}]}'], "broken.json", { type: "application/json" }));
    return files;
  });
  await page.locator(".shell").dispatchEvent("drop", { dataTransfer: transfer });
  await transfer.dispose();
  await expect(page.getByRole("alert")).toContainText("Invalid project haptic data");
  await expect(patternTitle(page)).toHaveText("Untitled pattern");
  expect(await savedProject()).toBe(before);
});

for (const theme of ["Light", "Dark"]) {
  test(`${theme} theme has no WCAG A or AA violations`, async ({ page }) => {
    const { default: AxeBuilder } = await import("@axe-core/playwright");
    await page.goto("/");
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await page.getByRole("radio", { name: theme, exact: true }).click();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);
    await page.getByRole("tab", { name: "sound", exact: true }).click();
    const sound = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(sound.violations).toEqual([]);
  });
}
