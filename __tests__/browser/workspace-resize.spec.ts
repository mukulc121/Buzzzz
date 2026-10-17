import { expect, test, type Locator, type Page } from "@playwright/test";

async function drag(page: Page, handle: Locator, x: number) {
  const box = await handle.boundingBox();
  if (!box) throw new Error("Missing resize handle");
  await page.mouse.move(box.x, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + x, box.y + box.height / 2, { steps: 8 });
  await page.mouse.up();
}

test("sidebar and inspector resize independently within Pulsar bounds", async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto("/");
  const sidebar = page.locator(".workspace-sidebar");
  const inspector = page.locator(".workspace-inspector");
  const sideHandle = page.getByRole("separator", { name: "Resize side panel", exact: true });
  const inspectorHandle = page.getByRole("separator", { name: "Resize inspector", exact: true });
  const width = (element: Locator) =>
    element.evaluate((node) => node.getBoundingClientRect().width);
  await expect.poll(() => width(sidebar)).toBe(280);
  await expect.poll(() => width(inspector)).toBe(300);
  await drag(page, sideHandle, 100);
  await expect.poll(() => width(sidebar)).toBe(380);
  await expect.poll(() => width(inspector)).toBe(300);
  await drag(page, sideHandle, -500);
  await expect.poll(() => width(sidebar)).toBe(200);
  await drag(page, inspectorHandle, -80);
  await expect.poll(() => width(inspector)).toBe(380);
  await drag(page, inspectorHandle, -500);
  await expect.poll(() => width(inspector)).toBe(460);
  await drag(page, inspectorHandle, 600);
  await expect.poll(() => width(inspector)).toBe(240);
  await expect.poll(() => width(sidebar)).toBe(200);
  await page.getByRole("button", { name: "Patterns", exact: true }).click();
  await expect(sideHandle).toHaveCount(0);
  await page.getByRole("button", { name: "Patterns", exact: true }).click();
  await expect.poll(() => width(sidebar)).toBe(200);
});
