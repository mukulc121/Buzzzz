import { expect } from "@playwright/test";
import { test } from "./hosted.fixture";

test.use({ baseURL: "http://127.0.0.1:5174" });

for (const theme of ["Light", "Dark"]) {
  test(`${theme} media and MCP controls stay readable at every sidebar width`, async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await page.getByRole("radio", { name: theme, exact: true }).click();
    for (const width of [320, 900, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.getByRole("button", { name: "Media", exact: true }).click();
      const library = page.getByRole("region", { name: "Media library", exact: true });
      await expect(library.getByText("0 B / 100 MiB", { exact: true })).toBeVisible();
      await expect(
        library.getByRole("heading", { name: "No media yet", exact: true }),
      ).toBeVisible();
      const upload = page.getByRole("button", { name: "Upload media", exact: true });
      await expect(upload).toBeVisible();
      await upload.click();
      const dialog = page.getByRole("dialog", { name: "Upload media", exact: true });
      await expect(dialog).toBeVisible();
      expect(
        await dialog.evaluate((element) => {
          const bounds = element.getBoundingClientRect();
          return bounds.left >= 0 && bounds.right <= innerWidth;
        }),
      ).toBe(true);
      await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
      await expect(dialog).not.toBeVisible();
      await page.getByRole("button", { name: "MCP", exact: true }).click();
      const connection = page.getByRole("region", { name: "MCP connection", exact: true });
      const endpoint = connection.getByRole("textbox", { name: "MCP endpoint", exact: true });
      await expect(endpoint).toHaveValue(
        /^http:\/\/127\.0\.0\.1:8788\/v1\/rooms\/[a-f0-9]{32}\/mcp$/,
      );
      expect(await endpoint.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
        true,
      );
      await connection.getByRole("button", { name: "JSON config", exact: true }).click();
      await expect(
        connection.getByRole("button", { name: "Copy JSON config", exact: true }),
      ).toBeAttached();
      expect(
        await connection
          .locator(".mcp-snippet pre")
          .evaluateAll((items) => items.every((item) => item.scrollWidth <= item.clientWidth)),
      ).toBe(true);
      expect(
        await connection
          .locator("dd")
          .evaluateAll((items) =>
            items.every((item) => getComputedStyle(item).marginLeft === "0px"),
          ),
      ).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    }
  });
}

test("media library imports and detaches a file through its visible controls", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Media", exact: true }).click();
  const library = page.getByRole("region", { name: "Media library", exact: true });
  await page.getByRole("button", { name: "Upload media", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Upload media", exact: true });
  const [picker] = await Promise.all([
    page.waitForEvent("filechooser"),
    dialog.getByRole("button", { name: "Choose files", exact: true }).click(),
  ]);
  await picker.setFiles("apps/preview/src/features/demos/lottie/bounce.json");
  await expect(dialog).not.toBeVisible();
  const files = library.getByRole("list", { name: "Media files", exact: true });
  await expect(files.getByText("bounce.json", { exact: true })).toBeVisible();
  await expect(files.getByText(/Animation.*attached/)).toBeVisible();
  await page.getByRole("button", { name: "Remove from canvas", exact: true }).click();
  await files.locator(".media-item").click({ button: "right" });
  await page.getByRole("menuitem", { name: "Add to canvas", exact: true }).click();
  await expect(files.getByText(/Animation.*attached/)).toBeVisible();
});

test("tool categories and presets fit the sidebar without nested padding", async ({ page }) => {
  await page.goto("/");
  for (const width of [320, 900, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.getByRole("button", { name: "Tools", exact: true }).click();
    const sidebar = page.locator(".workspace-sidebar");
    await expect(sidebar.getByRole("heading", { name: "Generate", exact: true })).toBeVisible();
    await sidebar.getByRole("button", { name: "Pulsar Library", exact: true }).click();
    await expect(
      sidebar.getByRole("searchbox", { name: "Search Pulsar presets", exact: true }),
    ).toBeVisible();
    const content = sidebar.getByRole("region", { name: "Pulsar Library", exact: true });
    expect(await content.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
      true,
    );
    await sidebar.getByRole("button", { name: "Back to tools", exact: true }).click();
    await sidebar.getByRole("button", { name: "Time Warp", exact: true }).click();
    await expect(sidebar.getByRole("slider", { name: "Time stretch", exact: true })).toBeVisible();
    expect(await sidebar.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
      true,
    );
    await sidebar.getByRole("button", { name: "Back to tools", exact: true }).click();
    await page.getByRole("button", { name: "Patterns", exact: true }).click();
  }
});
