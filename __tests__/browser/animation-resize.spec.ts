import { expect, test, type Locator, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("buzzzz.onboarding.seen", "true"));
  await page.routeWebSocket("**/relay?role=studio", (socket) =>
    socket.send(JSON.stringify({ type: "peers", phones: 0 })),
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
});

async function samplePreview(page: Page) {
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await page
    .locator(".project-dashboard-header")
    .getByRole("button", { name: "Create sample project", exact: true })
    .click();
  const preview = page.getByRole("region", { name: "Animation canvas preview", exact: true });
  await expect(preview).toBeVisible();
  return preview;
}

async function painted(canvas: Locator) {
  await expect
    .poll(() =>
      canvas.evaluate((element: HTMLCanvasElement) => {
        if (!element.width || !element.height) return false;
        const context = element.getContext("2d");
        if (!context) return false;
        const pixels = context.getImageData(0, 0, element.width, element.height).data;
        for (let index = 3; index < pixels.length; index += 4) if (pixels[index]) return true;
        return false;
      }),
    )
    .toBe(true);
}

test("a masked sample preview survives a zero-size layout and repaints after restoration", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const preview = await samplePreview(page);
  const canvas = preview.locator("canvas");
  await expect(canvas).toBeVisible();
  await preview.getByRole("button", { name: "Play animation", exact: true }).click();
  await painted(canvas);
  const hidden = await page.addStyleTag({
    content: ".animation-canvas { display: none !important }",
  });
  await expect(preview.locator(".animation-canvas")).toBeHidden();
  await page.waitForTimeout(150);
  expect(errors).toEqual([]);
  await hidden.evaluate((element) => element.parentNode?.removeChild(element));
  await expect(canvas).toBeVisible();
  await painted(canvas);
  await preview.getByRole("button", { name: "Pause animation", exact: true }).click();
  expect(errors).toEqual([]);
});

test("an initially zero-size sample waits for a usable container before creating its renderer", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const hidden = await page.addStyleTag({
    content: ".animation-canvas { display: none !important }",
  });
  const preview = await samplePreview(page);
  await expect(preview.locator(".animation-canvas")).toBeHidden();
  await page.waitForTimeout(150);
  expect(errors).toEqual([]);
  await hidden.evaluate((element) => element.parentNode?.removeChild(element));
  const canvas = preview.locator("canvas");
  await expect(canvas).toBeVisible();
  await preview.getByRole("button", { name: "Play animation", exact: true }).click();
  await painted(canvas);
  await preview.getByRole("button", { name: "Pause animation", exact: true }).click();
  expect(errors).toEqual([]);
});
