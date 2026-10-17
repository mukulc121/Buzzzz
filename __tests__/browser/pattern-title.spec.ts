import { expect, test, type Page } from "@playwright/test";
import { isProjectRecord } from "../../apps/studio/src/features/project/model";
import { patternTitle } from "./fixtures/pattern-title";

const titleInput = (page: Page) => page.getByRole("textbox", { name: "Pattern name", exact: true });

async function savedNames(page: Page) {
  const record: unknown = await page.evaluate(() => {
    const id = localStorage.getItem("buzzzz.lastProject");
    return JSON.parse(localStorage.getItem(`buzzzz.project.${id}`) ?? "null");
  });
  if (!isProjectRecord(record)) throw new Error("Missing saved project");
  return record.project.presets.map((preset) => preset.name);
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.routeWebSocket("**/relay?role=studio", (socket) =>
    socket.send(JSON.stringify({ type: "peers", phones: 0 })),
  );
  await page.goto("/");
  await expect(patternTitle(page)).toHaveText("Thud");
});

test("the resting heading enters a selected draft on double-click and commits trimmed text on Enter", async ({
  page,
}) => {
  await expect(titleInput(page)).toHaveCount(0);
  await expect(patternTitle(page)).toHaveAttribute("title", "Thud - double-click to rename");
  await patternTitle(page).dblclick();
  await expect(titleInput(page)).toBeFocused();
  expect(
    await titleInput(page).evaluate((node: HTMLInputElement) => [
      node.selectionStart,
      node.selectionEnd,
    ]),
  ).toEqual([0, 4]);
  await titleInput(page).fill("  Renamed pattern  ");
  expect(await savedNames(page)).toEqual(["Thud"]);
  await titleInput(page).press("Enter");
  await expect(patternTitle(page)).toHaveText("Renamed pattern");
  expect(await savedNames(page)).toEqual(["Renamed pattern"]);
  await page.reload();
  await expect(patternTitle(page)).toHaveText("Renamed pattern");
});

test("context Rename commits on blur and Escape or an empty draft preserves the saved name", async ({
  page,
}) => {
  await patternTitle(page).click({ button: "right" });
  await expect(page.getByRole("menuitem")).toHaveText(["Rename"]);
  await page.getByRole("menuitem", { name: "Rename", exact: true }).click();
  await titleInput(page).fill("  Blur commit  ");
  await page.getByRole("heading", { name: "Patterns", exact: true }).click();
  await expect(patternTitle(page)).toHaveText("Blur commit");
  expect(await savedNames(page)).toEqual(["Blur commit"]);

  await patternTitle(page).dblclick();
  await titleInput(page).fill("Cancelled");
  await titleInput(page).press("Escape");
  await expect(patternTitle(page)).toHaveText("Blur commit");
  expect(await savedNames(page)).toEqual(["Blur commit"]);

  await patternTitle(page).dblclick();
  await titleInput(page).fill("   ");
  await titleInput(page).press("Enter");
  await expect(patternTitle(page)).toHaveText("Blur commit");
  expect(await savedNames(page)).toEqual(["Blur commit"]);
});

test("New focuses and selects the header draft without a sidebar input", async ({ page }) => {
  const panel = page.getByRole("complementary", { name: "Project patterns", exact: true });
  await panel.getByRole("button", { name: "New pattern", exact: true }).click();
  await expect(titleInput(page)).toBeFocused();
  await expect(titleInput(page)).toHaveValue("Untitled pattern");
  expect(
    await titleInput(page).evaluate((node: HTMLInputElement) => [
      node.selectionStart,
      node.selectionEnd,
    ]),
  ).toEqual([0, "Untitled pattern".length]);
  await expect(patternTitle(page)).toHaveCount(0);
  await expect(panel.getByRole("textbox")).toHaveCount(0);
  await titleInput(page).fill("New tap");
  await titleInput(page).press("Enter");
  await expect(patternTitle(page)).toHaveText("New tap");
  await expect(panel.getByRole("button", { name: "New tap", exact: true })).toContainText(
    "100 ms · 0 discrete",
  );
});

test("sidebar rename stays local and does not rename or select the open header", async ({
  page,
}) => {
  const panel = page.getByRole("complementary", { name: "Project patterns", exact: true });
  await panel.getByRole("button", { name: "New pattern", exact: true }).click();
  await titleInput(page).press("Escape");
  await panel.getByRole("button", { name: "Thud", exact: true }).click({ button: "right" });
  await page.getByRole("menuitem", { name: "Rename", exact: true }).click();
  const rename = panel.getByRole("textbox", { name: "Rename Thud", exact: true });
  await expect(rename).toBeFocused();
  await expect(patternTitle(page)).toHaveText("Untitled pattern");
  await expect(titleInput(page)).toHaveCount(0);
  await rename.fill("  Inactive rename  ");
  await rename.press("Enter");
  await expect(patternTitle(page)).toHaveText("Untitled pattern");
  await expect(panel.getByRole("button", { name: "Inactive rename", exact: true })).toHaveAttribute(
    "aria-current",
    "false",
  );
  expect(await savedNames(page)).toEqual(["Inactive rename", "Untitled pattern"]);
});

test("a follower cannot enter header rename through double-click or its menu", async ({
  page,
  context,
}) => {
  const follower = await context.newPage();
  try {
    await follower.goto(page.url());
    await expect(patternTitle(follower)).toHaveAttribute("aria-disabled", "true");
    await patternTitle(follower).dblclick({ force: true });
    await expect(titleInput(follower)).toHaveCount(0);
    await patternTitle(follower).click({ button: "right", force: true });
    await expect(follower.getByRole("menuitem", { name: "Rename", exact: true })).toBeDisabled();
  } finally {
    await follower.close();
  }
});

for (const theme of ["Light", "Dark"]) {
  test(`${theme} title and rename input use the published dimensions and theme colors`, async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await page.getByRole("radio", { name: theme, exact: true }).check();
    const current = page.locator(".pattern-current");
    const icon = current.locator(":scope > svg");
    await expect(icon).toHaveCount(1);
    await expect(icon).toHaveCSS("width", "16px");
    await expect(icon).toHaveCSS("height", "16px");
    await expect(current).toHaveCSS("gap", "4px");
    await expect(current).toHaveCSS("padding", "0px 8px");
    await expect(page.locator(".pattern-header")).toHaveCSS("height", "48px");
    await expect(page.locator(".pattern-header")).toHaveCSS("gap", "0px");
    await expect(patternTitle(page)).toHaveCSS("font-size", "16px");
    await expect(patternTitle(page)).toHaveCSS("font-weight", "500");
    await expect(patternTitle(page)).toHaveCSS("padding", "2px 4px");
    await expect(patternTitle(page)).toHaveCSS("margin-bottom", "-4px");
    await expect(patternTitle(page)).toHaveCSS("border-radius", "2px");
    await patternTitle(page).hover();
    await expect(patternTitle(page)).toHaveCSS(
      "background-color",
      theme === "Light" ? "rgba(225, 243, 250, 0.6)" : "rgba(255, 255, 255, 0.04)",
    );
    await patternTitle(page).dblclick();
    await expect(titleInput(page)).toBeFocused();
    await expect(titleInput(page)).toHaveCSS("max-width", "320px");
    await expect(titleInput(page)).toHaveCSS("padding", "2px 4px");
    await expect(titleInput(page)).toHaveCSS("margin-left", "-4px");
    await expect(titleInput(page)).toHaveCSS("border-width", "2px");
    await expect(titleInput(page)).toHaveCSS(
      "border-color",
      theme === "Light" ? "rgb(56, 172, 221)" : "rgb(63, 177, 230)",
    );
    await expect(titleInput(page)).toHaveCSS(
      "box-shadow",
      `${theme === "Light" ? "rgba(56, 172, 221, 0.25)" : "rgba(63, 177, 230, 0.35)"} 0px 0px 0px 3px`,
    );
  });
}
