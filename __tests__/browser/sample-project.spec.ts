import { patternTitle } from "./fixtures/pattern-title";
import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("buzzzz.onboarding.seen", "true"));
  await page.routeWebSocket("**/relay?role=studio", (socket) =>
    socket.send(JSON.stringify({ type: "peers", phones: 0 })),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Projects", exact: true }).click();
});

test("the separate sample action creates the original three patterns and their real attachments", async ({
  page,
}) => {
  await page
    .locator(".project-dashboard-header")
    .getByRole("button", { name: "Create sample project", exact: true })
    .click();
  const patterns = page.getByRole("complementary", { name: "Project patterns", exact: true });
  for (const [name, metadata] of [
    ["ExplosionAnimation", "2333 ms · 15 discrete"],
    ["FanfareSound", "5187 ms · 38 discrete"],
    ["JustHaptics", "4366 ms · 11 discrete"],
  ])
    await expect(patterns.getByRole("button", { name, exact: true })).toContainText(metadata);
  await expect(patternTitle(page)).toHaveText("ExplosionAnimation");
  await page.getByRole("tab", { name: "animation", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Animation canvas preview", exact: true }).locator("canvas"),
  ).toBeVisible({ timeout: 20000 });
  await patterns.getByRole("button", { name: "FanfareSound", exact: true }).click();
  await page.getByRole("tab", { name: "sound", exact: true }).click();
  await expect(
    page
      .getByRole("tabpanel", { name: "sound", exact: true })
      .getByText("fanfaresound.mp3", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Media", exact: true }).click();
  await expect(page.locator(".media-item")).toHaveCount(2);
  await expect(
    page.locator(".media-item").filter({ hasText: "explosionanimation.json" }),
  ).toBeVisible();
  await expect(page.locator(".media-item").filter({ hasText: "fanfaresound.mp3" })).toBeVisible();
  await page.reload();
  await expect(patterns.locator(".pattern-select")).toHaveCount(3);
  await patterns.getByRole("button", { name: "FanfareSound", exact: true }).click();
  await page.getByRole("tab", { name: "sound", exact: true }).click();
  await expect(
    page
      .getByRole("tabpanel", { name: "sound", exact: true })
      .getByText("fanfaresound.mp3", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await expect(
    page.locator(".project-card").filter({ hasText: "Starting Demo Project" }),
  ).toBeVisible();
});

test("ordinary project creation remains separate from the sample template", async ({ page }) => {
  await page
    .locator(".project-dashboard-header")
    .getByRole("button", { name: "Create new project", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Create project", exact: true });
  await dialog.getByRole("textbox", { name: "Project name", exact: true }).fill("Empty project");
  await dialog.getByRole("button", { name: "Create", exact: true }).click();
  const patterns = page.getByRole("complementary", { name: "Project patterns", exact: true });
  await expect(patterns.locator(".pattern-select")).toHaveCount(1);
  await expect(
    patterns.getByRole("button", { name: "Untitled pattern", exact: true }),
  ).toContainText("0 discrete");
  for (const name of ["ExplosionAnimation", "FanfareSound", "JustHaptics"])
    await expect(patterns.getByRole("button", { name, exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Media", exact: true }).click();
  await expect(page.locator(".media-item")).toHaveCount(0);
});

test("sample action remains visible without overflow on a narrow dashboard", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page
      .locator(".project-dashboard-header")
      .getByRole("button", { name: "Create sample project", exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
