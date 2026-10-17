import { expect, type Page } from "@playwright/test";

export async function openRiveInspector(page: Page) {
  await page.getByRole("tab", { name: "animation", exact: true }).click();
  const inspector = page.locator(".rive-inspector");
  await expect(inspector).toBeVisible();
  return inspector;
}

export async function setRiveSound(page: Page, enabled: boolean) {
  await page.getByRole("tab", { name: "inspector", exact: true }).click();
  await page.getByRole("switch", { name: "Haptics as sound", exact: true }).setChecked(enabled);
  await openRiveInspector(page);
}
