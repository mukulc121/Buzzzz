import { expect, test } from "@playwright/test";

// Measured with Pulsar Studio's shipped CSS and the bundled DM Sans at browser zoom 100%.
const sectionGeometry = [
  { title: "Appearance", y: 0, height: 112 },
  { title: "Grid", y: 112, height: 126.390625 },
  { title: "Values", y: 238.390625, height: 126.390625 },
  { title: "Pointer", y: 364.78125, height: 82 },
  { title: "Playback", y: 446.78125, height: 82 },
  { title: "Selection", y: 528.78125, height: 82 },
];

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.routeWebSocket("**/relay?role=studio", (socket) =>
    socket.send(JSON.stringify({ type: "peers", phones: 0 })),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.evaluate(() => document.fonts.ready);
});

test("settings retain the source section, font, icon and control metrics", async ({ page }) => {
  const panel = page.locator(".settings-panel");
  const sections = await panel.locator(".settings-section").evaluateAll((elements) => {
    const origin = elements[0].getBoundingClientRect().top;
    return elements.slice(0, 6).map((element) => ({
      title: element.querySelector("h3")?.textContent,
      y: element.getBoundingClientRect().top - origin,
      height: element.getBoundingClientRect().height,
    }));
  });
  expect(sections).toEqual(sectionGeometry);
  await expect(panel.locator(".settings-section > h3").first()).toHaveCSS("font-weight", "700");
  await expect(panel.locator(".settings-section > h3").first()).toHaveCSS("font-size", "12px");
  await expect(panel.locator(".settings-label").first()).toHaveCSS("font-weight", "600");
  await expect(panel.locator(".settings-label").first()).toHaveCSS("font-size", "14px");
  await expect(panel.locator(".settings-label").first()).toHaveCSS("line-height", "normal");
  await expect(panel.locator(".theme-chooser")).toHaveCSS("height", "34px");
  await expect(panel.getByRole("radio").first()).toHaveCSS("font-weight", "500");
  await expect(panel.getByRole("radio").first()).toHaveCSS("line-height", "14.4px");
  await expect(panel.locator(".theme-choice-label").first()).toBeVisible();
  await expect(panel.getByRole("button", { name: "About Theme", exact: true })).toHaveCSS(
    "width",
    "16px",
  );
  await expect(panel.getByRole("switch").first()).toHaveCSS("height", "24px");
  const density = page.getByRole("button", { name: "Grid density", exact: true });
  await expect(density).toHaveCSS("height", "46.3906px");
  await expect(density).toHaveCSS("padding", "10px 12px 10px 14px");
  await expect(density).toHaveCSS("font-weight", "400");
  await expect(density.locator("svg")).toHaveCSS("width", "18px");
  const before = await panel.boundingBox();
  await density.click();
  const list = page.getByRole("listbox", { name: "Grid density", exact: true });
  await list.evaluate((element) =>
    Promise.all(element.getAnimations().map((animation) => animation.finished)),
  );
  const triggerBox = await density.boundingBox();
  const listBox = await list.boundingBox();
  if (!triggerBox || !listBox) throw new Error("Missing select bounds");
  expect(listBox.y - triggerBox.y - triggerBox.height).toBe(4);
  expect(listBox.width).toBe(triggerBox.width);
  await expect(list).toHaveCSS("padding", "4px");
  await expect(list.getByRole("option").first()).toHaveCSS("padding", "8px 10px");
  expect(await panel.boundingBox()).toEqual(before);
});

test("settings popovers support source keyboard selection and dismissal", async ({ page }) => {
  const density = page.getByRole("button", { name: "Grid density", exact: true });
  await density.focus();
  await page.keyboard.press("ArrowDown");
  await expect(density).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  await expect(density).toHaveText("Dense");
  await expect(density).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("Home");
  await page.keyboard.press("Escape");
  await expect(density).toHaveText("Dense");
  await density.click();
  await page.getByRole("heading", { name: "Appearance", exact: true }).click();
  await expect(density).toHaveAttribute("aria-expanded", "false");
});
