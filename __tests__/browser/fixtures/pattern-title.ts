import { expect, type Page } from "@playwright/test";

export const patternTitle = (page: Page) =>
  page.locator(".pattern-header").getByRole("heading", { level: 1 });

export async function renamePattern(page: Page, name: string) {
  await patternTitle(page).dblclick();
  const input = page.getByRole("textbox", { name: "Pattern name", exact: true });
  await input.fill(name);
  await input.press("Enter");
  await expect(patternTitle(page)).toHaveText(name.trim());
}
