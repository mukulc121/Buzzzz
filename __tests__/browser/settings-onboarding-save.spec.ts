import { expect, test, type Page } from "@playwright/test";
import { isProjectRecord } from "../../apps/studio/src/features/project/model";
import { WALKTHROUGHS } from "../../apps/studio/src/features/learn/tours";

test.beforeEach(async ({ page }) => {
  await page.routeWebSocket("**/relay?role=studio", (socket) =>
    socket.send(JSON.stringify({ type: "peers", phones: 0 })),
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
});

async function savedRecord(page: Page) {
  const value: unknown = await page.evaluate(() => {
    const id = localStorage.getItem("buzzzz.lastProject");
    return JSON.parse(localStorage.getItem(`buzzzz.project.${id}`) ?? "null");
  });
  if (!isProjectRecord(value)) throw new Error("Missing saved project");
  return value;
}

for (const theme of ["light", "dark"]) {
  test(`${theme} Settings Help uses the real onboarding flow and persisted progress`, async ({
    page,
  }, testInfo) => {
    await page.addInitScript((value) => localStorage.setItem("rive-haptics-theme", value), theme);
    await page.goto("/");
    await expect(page.locator(".save-status")).toHaveAttribute("data-status", /editing|unlocked/);
    const before = await savedRecord(page);
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await page.evaluate(() => document.fonts.ready);
    const panel = page.locator(".settings-panel");
    await expect(panel.locator(".settings-note")).toHaveText(
      "Four walkthroughs cover drawing a pattern, pairing a phone, and generating one from audio or animation - 0 of 4 done.",
    );
    await expect(page.locator(".panel-heading")).toHaveCSS("height", "48px");
    expect((await panel.getByRole("heading", { name: "Appearance" }).boundingBox())?.y).toBe(64);
    const saveRow = panel.locator(".settings-shortcuts").first().locator("li").first();
    await expect(saveRow.locator("span")).toHaveText("Save now");
    await expect(saveRow.locator("kbd")).toHaveText(
      await page.evaluate(() =>
        /Mac|iPhone|iPad|iPod/.test(navigator.userAgent) ? "⌘S" : "Ctrl+S",
      ),
    );
    const help = panel.locator(".settings-section").filter({
      has: page.getByRole("heading", { name: "Help", exact: true }),
    });
    const onboarding = help.getByRole("button", { name: "Show onboarding", exact: true });
    await onboarding.scrollIntoViewIfNeeded();
    await expect(onboarding).toHaveCSS("font-size", "14px");
    await expect(onboarding).toHaveCSS("padding", "8px 14px");
    await expect(onboarding).toHaveCSS("height", "36px");
    await expect(onboarding.locator("svg")).toHaveAttribute("width", "16");
    const docs = help.getByRole("link", { name: "Documentation", exact: true });
    await expect(docs).toHaveAttribute("href", "https://docs.swmansion.com/pulsar/studio/");
    await expect(docs).toHaveAttribute("target", "_blank");
    expect(
      await docs
        .locator("svg")
        .evaluateAll((icons) => icons.map((icon) => icon.getAttribute("width"))),
    ).toEqual(["16", "14"]);
    await expect(help.locator(".settings-help-actions")).toHaveCSS("gap", "8px");
    await help.screenshot({ path: testInfo.outputPath(`${theme}-help.png`) });
    const route = page.url();
    await onboarding.click();
    const welcome = page.getByRole("dialog", { name: "Welcome to Buzzzz Studio", exact: true });
    await expect(welcome).toBeVisible();
    expect(page.url()).toBe(route);
    const tour = WALKTHROUGHS[1];
    await welcome
      .locator(".learn-tour-card")
      .filter({
        has: page.locator(".learn-card-title", { hasText: tour.title }),
      })
      .click();
    for (const [index, step] of tour.steps.entries()) {
      await expect(page.locator(".driver-popover-title")).toHaveText(step.title);
      await expect(page.locator(".driver-popover-progress-text")).toHaveText(
        `${index + 1} of ${tour.steps.length}`,
      );
      await expect(page.locator(".driver-active-element")).toBeVisible();
      await page.locator(".driver-popover-next-btn").click();
    }
    await expect(page.locator(".learn-completion")).toContainText("1 of 4 walkthroughs done");
    await page
      .locator(".learn-completion")
      .getByRole("button", { name: "Later", exact: true })
      .click();
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await expect(panel.locator(".settings-note")).toContainText("1 of 4 done.");
    expect((await savedRecord(page)).project).toEqual(before.project);
    await page.reload();
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await expect(panel.locator(".settings-note")).toContainText("1 of 4 done.");
    await panel.getByRole("button", { name: "Show onboarding", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Getting started", exact: true })).toBeVisible();
    await expect(
      page.getByRole("progressbar", { name: "Walkthroughs finished", exact: true }),
    ).toHaveAttribute("aria-valuenow", "1");
  });
}

for (const modifier of ["Control", "Meta"]) {
  test(`${modifier}+S retries the current edit after a storage failure without moving focus`, async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator(".save-status")).toHaveAttribute("data-status", /editing|unlocked/);
    const chart = page.getByRole("group", { name: "Haptic pattern timeline", exact: true });
    await chart
      .getByRole("button", { name: /^Tap at/ })
      .first()
      .click();
    const intensity = page.getByRole("spinbutton", { name: "Selected intensity", exact: true });
    const before = await savedRecord(page);
    await page.evaluate(() => {
      const original = Storage.prototype.setItem;
      let fail = true;
      Storage.prototype.setItem = function (key, value) {
        if (fail && key.startsWith("buzzzz.project.")) {
          fail = false;
          throw new DOMException("Storage full", "QuotaExceededError");
        }
        return original.call(this, key, value);
      };
    });
    await intensity.fill("64.3");
    await expect(page.locator(".save-status")).toHaveAttribute("data-status", "storage-error");
    expect(await savedRecord(page)).toEqual(before);
    await expect(intensity).toBeFocused();
    await intensity.press(`${modifier}+s`);
    await expect(page.locator(".save-status")).toHaveAttribute("data-status", /editing|unlocked/);
    const after = await savedRecord(page);
    expect(after.project.presets[0].pattern.discretePattern[0].amplitude).toBe(0.643);
    expect(after.revision).toBe(before.revision + 1);
    expect(after.project.presets[0].id).toBe(before.project.presets[0].id);
    await expect(intensity).toBeFocused();
    await intensity.press(`${modifier}+s`);
    expect(await savedRecord(page)).toEqual(after);
    await page.reload();
    expect((await savedRecord(page)).project).toEqual(after.project);
  });
}

test("Save now prevents browser Save Page in a follower without writing the project", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await expect(page.locator(".save-status")).toHaveAttribute("data-status", "editing");
  const before = await savedRecord(page);
  const follower = await context.newPage();
  await follower.routeWebSocket("**/relay?role=studio", (socket) =>
    socket.send(JSON.stringify({ type: "peers", phones: 0 })),
  );
  await follower.goto(`/studio/projects/${before.id}`);
  await expect(follower.locator(".save-status")).toHaveAttribute("data-status", "read-only");
  const prevented = await follower.evaluate(() => {
    const event = new KeyboardEvent("keydown", {
      key: "s",
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(event);
    return event.defaultPrevented;
  });
  expect(prevented).toBe(true);
  expect(await savedRecord(follower)).toEqual(before);
  await expect(follower.locator(".save-status")).toHaveAttribute("data-status", "read-only");
});
