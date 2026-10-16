import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { WALKTHROUGHS } from "../../apps/studio/src/features/learn/tours";

test.use({ storageState: { cookies: [], origins: [] } });
test.beforeEach(async ({ page }) => {
  await page.routeWebSocket("**/relay?role=studio", (socket) =>
    socket.send(JSON.stringify({ type: "peers", phones: 0 })),
  );
});

async function savedProject(page: Page) {
  return page.evaluate(() => {
    const id = localStorage.getItem("buzzzz.lastProject");
    return JSON.parse(localStorage.getItem(`buzzzz.project.${id}`) ?? "null").project;
  });
}

test("first-run welcome is dismissible once, Learn reopens it without changing the route", async ({
  page,
}) => {
  await page.goto("/");
  const welcome = page.getByRole("dialog", { name: "Welcome to Buzzzz Studio", exact: true });
  await expect(welcome).toBeVisible();
  await welcome.screenshot({ path: "/tmp/buzzzz-learn-welcome.png" });
  await expect(welcome.locator(".learn-tour-card")).toHaveCount(4);
  expect(await welcome.locator(".learn-card-meta").allTextContents()).toEqual([
    "11 steps",
    "5 steps",
    "6 steps",
    "5 steps",
  ]);
  await welcome.getByRole("button", { name: "I’ll explore on my own", exact: true }).click();
  await expect(welcome).not.toBeVisible();
  await page.getByRole("button", { name: "Got it", exact: true }).click();
  await page.reload();
  await expect(welcome).not.toBeVisible();
  const route = page.url();
  await page.getByRole("button", { name: "Learn", exact: true }).click();
  await expect(welcome).toBeVisible();
  expect(page.url()).toBe(route);
  await page.keyboard.press("Escape");
  await expect(welcome).not.toBeVisible();
});

test("all four source walkthroughs navigate real editor anchors and persist completion", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.goto("/");
  const before = await savedProject(page);
  for (const [index, tour] of WALKTHROUGHS.entries()) {
    if (index > 0) await page.getByRole("button", { name: "Learn", exact: true }).click();
    const dialog = page.locator(".learn-dialog");
    await dialog
      .locator(".learn-tour-card")
      .filter({ has: page.locator(".learn-card-title", { hasText: tour.title }) })
      .click();
    for (const [stepIndex, step] of tour.steps.entries()) {
      await expect(page.locator(".driver-popover-title")).toHaveText(step.title);
      await expect(page.locator(".driver-popover-progress-text")).toHaveText(
        `${stepIndex + 1} of ${tour.steps.length}`,
      );
      await expect(page.locator(".driver-active-element")).toBeVisible();
      await expect(page.locator(".driver-active-element")).not.toHaveAttribute(
        "id",
        "driver-dummy-element",
      );
      await page.locator(".driver-popover-next-btn").click();
    }
    await expect(page.locator(".driver-popover")).toHaveCount(0);
    await expect(page.locator(".learn-completion")).toContainText(
      `${index + 1} of 4 walkthroughs done`,
    );
    await page
      .locator(".learn-completion")
      .getByRole("button", { name: index === 3 ? "Back to work" : "Later", exact: true })
      .click();
    expect(await savedProject(page)).toEqual(before);
  }
  await page.reload();
  await expect(page.locator(".learn-dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Learn", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Getting started", exact: true })).toBeVisible();
  await expect(
    page.getByRole("progressbar", { name: "Walkthroughs finished", exact: true }),
  ).toHaveAttribute("aria-valuenow", "4");
  await expect(page.locator(".learn-tour-card.done")).toHaveCount(4);
  const accessibility = await new AxeBuilder({ page })
    .include(".learn-dialog")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(accessibility.violations).toEqual([]);
  await page.locator(".learn-tour-card").first().click();
  await expect(page.locator(".driver-popover-title")).toHaveText("Everything is one rail away");
  await page.keyboard.press("Escape");
  await expect(page.locator(".driver-popover")).toHaveCount(0);
});

for (const theme of ["light", "dark"]) {
  test(`${theme} welcome fits narrow screens and passes AA accessibility`, async ({ page }) => {
    await page.addInitScript((value) => localStorage.setItem("rive-haptics-theme", value), theme);
    await page.goto("/");
    for (const width of [320, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      const dialog = page.locator(".learn-dialog");
      await expect(dialog).toBeVisible();
      expect(
        await dialog.evaluate((element) => {
          const box = element.getBoundingClientRect();
          return (
            box.left >= 0 && box.right <= innerWidth && element.scrollWidth <= element.clientWidth
          );
        }),
      ).toBe(true);
      const results = await new AxeBuilder({ page })
        .include(".learn-dialog")
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(results.violations).toEqual([]);
    }
  });
}
