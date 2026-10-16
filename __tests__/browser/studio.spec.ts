import { expect, test } from "@playwright/test";
for (const width of [320, 375, 390, 700, 768, 1024, 1180, 1280, 1440, 1920]) {
  test(`editor fits at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 768 });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Make it feel right." })).toBeVisible();
    await expect(page.locator(".qr")).toBeVisible();
    const overflow = await page.evaluate(() => {
      const viewport = document.documentElement.clientWidth;
      const files = document.querySelector(".files");
      if (!files) throw new Error("Missing import and export controls");
      const bounds = files.getBoundingClientRect();
      return {
        page: document.documentElement.scrollWidth > viewport,
        actions: Array.from(files.children).some((element) => {
          if (element.getClientRects().length === 0) return false;
          const rect = element.getBoundingClientRect();
          return rect.left < bounds.left - 1 || rect.right > bounds.right + 1;
        }),
        content: Array.from(
          document.querySelectorAll("main, aside, .card, .chart-card, .toolbar, .files"),
        )
          .filter((element) => {
            const rect = element.getBoundingClientRect();
            return rect.left < -1 || rect.right > viewport + 1;
          })
          .map((element) => element.className),
      };
    });
    expect(overflow).toEqual({ page: false, actions: false, content: [] });
    const chartLayout = await page.locator(".chart-card").evaluate((card) => {
      const chart = card.querySelector(".chart");
      const inspector = card.querySelector(".inspector");
      if (!chart || !inspector) throw new Error("Missing chart contents");
      return {
        height: chart.getBoundingClientRect().height,
        clipped: inspector.getBoundingClientRect().bottom > card.getBoundingClientRect().bottom + 1,
      };
    });
    expect(chartLayout.height).toBeGreaterThanOrEqual(240);
    expect(chartLayout.clipped).toBe(false);
    const address = await page
      .getByRole("textbox", { name: "Relay address", exact: true })
      .evaluate((input) => {
        if (!(input instanceof HTMLInputElement)) throw new Error("Missing address input");
        return { clipped: input.scrollWidth > input.clientWidth + 1, value: input.value };
      });
    expect(address.clipped).toBe(false);
    expect(address.value).toMatch(/^ws:\/\/.+\/relay$/);
    await page.getByRole("button", { name: "Pulsar library" }).click();
    await page.getByRole("searchbox", { name: "Search Pulsar presets" }).fill("alarm");
    await expect(page.getByRole("button", { name: "Preview Alarm", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Add Alarm to project", exact: true }).click();
    await expect(page.getByRole("textbox", { name: "Pattern name" })).toHaveValue("Alarm");
  });
}
test("patterns persist, undo works and imports fail safely", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByRole("button", { name: "New", exact: true }).click();
  await page.getByRole("textbox", { name: "Pattern name" }).fill("Browser check");
  await page.getByRole("textbox", { name: "Pattern name" }).blur();
  await page.reload();
  await expect(page.getByRole("button", { name: "Browser check", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "New", exact: true }).click();
  await page.keyboard.press("Control+z");
  await expect(page.getByRole("textbox", { name: "Pattern name" })).toHaveValue("Thud");
  await page.locator(".files input[type=file]").setInputFiles({
    name: "broken.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"presets":[{}]}'),
  });
  await expect(page.getByRole("alert")).toContainText("valid Pulsar pattern");
  await page.getByRole("button", { name: "Dismiss error" }).click();
  await page.getByRole("radio", { name: "Dark", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator(".files")).toBeVisible();
  expect(errors).toEqual([]);
});
for (const theme of ["Light", "Dark"]) {
  test(`${theme} theme has no WCAG A or AA accessibility violations`, async ({ page }) => {
    const { default: AxeBuilder } = await import("@axe-core/playwright");
    await page.goto("/");
    await page.getByRole("radio", { name: theme, exact: true }).click();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });
}
