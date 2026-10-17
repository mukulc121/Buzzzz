import { expect, test, type Page } from "@playwright/test";
import { isProject, isRecord } from "@buzzzz/core";

async function savedPattern(page: Page, name = "Thud") {
  const text = await page.evaluate(() =>
    localStorage.getItem(`buzzzz.project.${localStorage.getItem("buzzzz.lastProject")}`),
  );
  const record: unknown = JSON.parse(text ?? "null");
  if (!isRecord(record) || !isProject(record.project)) throw new Error("Saved project missing");
  const preset = record.project.presets.find((item) => item.name === name);
  if (!preset) throw new Error(`Pattern ${name} missing`);
  return preset.pattern;
}

test.beforeEach(async ({ page }) => {
  await page.routeWebSocket("**/relay?role=studio", (socket) =>
    socket.send(JSON.stringify({ type: "peers", phones: 0 })),
  );
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto("/");
  await expect(
    page.getByRole("group", { name: "Haptic pattern timeline", exact: true }),
  ).not.toHaveAttribute("data-readonly", "true");
});

test("chart menu preserves selected groups, selects unselected active points and uses source order", async ({
  page,
}) => {
  const chart = page.getByRole("group", { name: "Haptic pattern timeline", exact: true });
  const bounds = await chart.boundingBox();
  if (!bounds) throw new Error("Missing chart");
  await chart.click({ button: "right", position: { x: bounds.width - 20, y: 40 } });
  const menu = page.getByRole("menu");
  await expect(menu.locator(".context-menu-label")).toHaveText([
    "Undo",
    "Redo",
    "Add marker here",
    "Save range as snippet…",
    "Open from file…",
    "Zoom in",
    "Zoom out",
    "Move left",
    "Move right",
    "Intensity",
    "Frequency",
    "Discrete",
    "Select active layer",
    "Clear all",
  ]);
  await expect(menu.getByRole("menuitem", { name: /^Undo/ })).toBeDisabled();
  await expect(menu.getByRole("menuitem", { name: /^Redo/ })).toBeDisabled();
  await menu.getByRole("menuitem", { name: /^Select active layer/ }).click();
  await expect(chart.locator('[aria-pressed="true"]')).toHaveCount(3);
  await chart.getByRole("button", { name: /^Intensity point at 120/ }).click({ button: "right" });
  await expect(menu.locator(".context-menu-label")).toHaveText([
    "Undo",
    "Redo",
    "Copy",
    "Save range as snippet…",
    "Delete 3 points",
  ]);
  await chart.click({ button: "right", position: { x: bounds.width - 20, y: 40 } });
  await expect(menu.getByRole("menuitem", { name: /^Delete 3 points/ })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("radio", { name: "Edit frequency", exact: true }).check();
  const frequency = await chart
    .getByRole("button", { name: /^Frequency point at 0/ })
    .boundingBox();
  if (!frequency) throw new Error("Missing frequency point");
  await page.mouse.click(frequency.x + frequency.width / 2, frequency.y + frequency.height / 2, {
    button: "right",
  });
  await expect(menu.getByRole("menuitem", { name: /^Delete(?:\s|$)/ })).toBeVisible();
  await expect(chart.locator('[aria-pressed="true"]')).toHaveCount(1);
  await menu.getByRole("menuitem", { name: /^Delete(?:\s|$)/ }).click();
  await expect(chart.getByRole("button", { name: /^Frequency point/ })).toHaveCount(1);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(chart.getByRole("button", { name: /^Frequency point/ })).toHaveCount(2);
  await chart.click({ button: "right", position: { x: bounds.width - 20, y: 40 } });
  await menu.getByRole("menuitem", { name: "Clear all", exact: true }).click();
  await expect(chart.locator('[role="button"]')).toHaveCount(0);
  await chart.click({ button: "right", position: { x: bounds.width - 20, y: 40 } });
  await expect(menu.getByRole("menuitem", { name: "Clear all", exact: true })).toBeDisabled();
  await expect(menu.getByRole("menuitem", { name: /^Select active layer/ })).toBeDisabled();
  await menu.getByRole("menuitem", { name: /^Undo/ }).click();
  await expect(chart.getByRole("button", { name: /^Intensity point/ })).toHaveCount(3);
});

test("Copy and draggable Paste preview replace only chosen layers on Apply and Undo restores the source", async ({
  page,
}, testInfo) => {
  const chart = page.getByRole("group", { name: "Haptic pattern timeline", exact: true });
  const original = await savedPattern(page);
  await chart.focus();
  await page.keyboard.press("Control+a");
  await page.keyboard.press("Control+c");
  await page.getByRole("button", { name: "Tools", exact: true }).click();
  await page.keyboard.press("Control+v");
  const modes = page.getByRole("group", { name: "Paste layers", exact: true });
  await expect(modes).toBeVisible();
  for (const theme of ["light", "dark"]) {
    await page.evaluate((theme) => (document.documentElement.dataset.theme = theme), theme);
    const applyBounds = await page
      .getByRole("button", { name: "Apply paste", exact: true })
      .boundingBox();
    const modeBounds = await modes.getByRole("button", { name: "Both", exact: true }).boundingBox();
    expect(applyBounds?.height).toBe(28);
    expect(modeBounds?.height).toBeCloseTo(26.296875, 2);
    await expect(modes.getByRole("button", { name: "Both", exact: true })).toHaveCSS(
      "border-style",
      "outset",
    );
    await page.screenshot({ path: testInfo.outputPath(`paste-${theme}.png`) });
  }
  expect(await savedPattern(page)).toEqual(original);
  const ghost = chart.locator("[data-paste-preview] > rect");
  const before = await ghost.boundingBox();
  if (!before) throw new Error("Missing paste preview");
  await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2);
  await page.mouse.down();
  await page.mouse.move(before.x + before.width / 2 + 80, before.y + before.height / 2, {
    steps: 6,
  });
  await page.mouse.up();
  const after = await ghost.boundingBox();
  if (!after) throw new Error("Missing moved paste preview");
  expect(after.x).toBeGreaterThan(before.x + 70);
  await modes.getByRole("button", { name: "Amplitude", exact: true }).click();
  await expect(chart.locator("[data-paste-preview] polyline")).toHaveCount(1);
  await page.getByRole("button", { name: "Apply paste", exact: true }).click();
  await expect(modes).toHaveCount(0);
  await expect
    .poll(async () => (await savedPattern(page)).continuousPattern.amplitude.length)
    .toBe(4);
  const pasted = await savedPattern(page);
  expect(pasted.continuousPattern.frequency).toEqual(original.continuousPattern.frequency);
  expect(pasted.discretePattern).toEqual(original.discretePattern);
  expect(pasted.continuousPattern.amplitude.at(-1)?.time).toBeGreaterThan(300);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect.poll(() => savedPattern(page)).toEqual(original);
  await page.keyboard.press("Control+v");
  await expect(modes).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(modes).toHaveCount(0);
  expect(await savedPattern(page)).toEqual(original);
});

test("paste survives source Copy across patterns and cancels pointer ownership on every terminal event", async ({
  page,
}) => {
  const chart = page.getByRole("group", { name: "Haptic pattern timeline", exact: true });
  const original = await savedPattern(page);
  await chart.focus();
  await page.keyboard.press("Control+a");
  await page.keyboard.press("Control+c");
  await page.getByRole("button", { name: "New pattern", exact: true }).click();
  await chart.focus();
  await page.keyboard.press("Control+v");
  const modes = page.getByRole("group", { name: "Paste layers", exact: true });
  await expect(modes).toBeVisible();
  const ghost = chart.locator("[data-paste-preview] > rect");
  for (const type of ["pointercancel", "lostpointercapture"]) {
    const bounds = await ghost.boundingBox();
    if (!bounds) throw new Error("Missing paste band");
    const x = bounds.x + Math.min(bounds.width / 2, 80);
    const y = bounds.y + bounds.height / 2;
    const initial = await ghost.getAttribute("x");
    await page.mouse.move(x, y);
    await page.mouse.down();
    await chart.dispatchEvent(type, { pointerId: 1, pointerType: "mouse", isPrimary: true });
    await chart.dispatchEvent("pointermove", {
      pointerId: 1,
      pointerType: "mouse",
      isPrimary: true,
      clientX: x + 90,
      clientY: y,
      buttons: 0,
    });
    await expect(ghost).toHaveAttribute("x", initial ?? "");
    await page.mouse.up();
  }
  await page.getByRole("button", { name: "Apply paste", exact: true }).click();
  await expect
    .poll(async () => (await savedPattern(page, "Untitled pattern")).continuousPattern.amplitude)
    .toEqual(original.continuousPattern.amplitude);
  await page.getByRole("button", { name: "Thud", exact: true }).click();
  expect(await savedPattern(page)).toEqual(original);
});
