import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import { unzipSync } from "fflate";

const sampleAudio = unzipSync(
  readFileSync(
    new URL(
      "../../apps/studio/src/features/project/starter/starting-demo-project.pulsar",
      import.meta.url,
    ),
  ),
)["audio/fanfaresound.mp3"]!;

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("buzzzz.onboarding.seen", "true"));
  await page.routeWebSocket("**/relay?role=studio", (socket) =>
    socket.send(JSON.stringify({ type: "peers", phones: 0 })),
  );
});

async function uploadAnimation(page: Page) {
  await page.getByRole("button", { name: "Media", exact: true }).click();
  await page.getByRole("button", { name: "Upload media", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Upload media", exact: true });
  const [picker] = await Promise.all([
    page.waitForEvent("filechooser"),
    dialog.getByRole("button", { name: "Choose files", exact: true }).click(),
  ]);
  await picker.setFiles("apps/preview/src/features/demos/lottie/bounce.json");
  await expect(dialog).not.toBeVisible();
  return page.locator(".media-item").filter({ hasText: "bounce.json" });
}

test("media uses double-click rename and a real keyboard/right-click context menu", async ({
  page,
}) => {
  await page.goto("/");
  const row = await uploadAnimation(page);
  await row.getByText("bounce.json", { exact: true }).click();
  await expect(row.getByRole("textbox")).toHaveCount(0);
  await row.getByText("bounce.json", { exact: true }).dblclick();
  const rename = page.getByRole("textbox", { name: "Rename bounce.json", exact: true });
  await rename.fill("cancelled.json");
  await rename.press("Escape");
  await expect(row.getByText("bounce.json", { exact: true })).toBeVisible();
  await row.click({ button: "right" });
  await expect(page.getByRole("menuitem", { name: "Add to canvas", exact: true })).toBeEnabled();
  await expect(page.getByRole("menuitem", { name: "Download", exact: true })).toBeVisible();
  await page.getByRole("menuitem", { name: "Rename", exact: true }).click();
  await rename.fill("renamed.json");
  await rename.press("Enter");
  const changed = page.locator(".media-item").filter({ hasText: "renamed.json" });
  await expect(changed).toBeVisible();
  await changed.focus();
  await page.keyboard.press("Shift+F10");
  await expect(page.getByRole("menuitem", { name: "Add to canvas", exact: true })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("menuitem", { name: "Download", exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(changed).toBeFocused();
  await page.reload();
  await page.getByRole("button", { name: "Media", exact: true }).click();
  await expect(
    page.locator(".media-item").getByText("renamed.json", { exact: true }),
  ).toBeVisible();
});

test("media drag and Add to canvas attach the existing file to the active pattern", async ({
  page,
}) => {
  await page.goto("/");
  const row = await uploadAnimation(page);
  await page.getByRole("button", { name: "Patterns", exact: true }).click();
  await page.getByRole("button", { name: "New pattern", exact: true }).click();
  await page.getByRole("button", { name: "Media", exact: true }).click();
  await expect(row).toHaveAttribute("draggable", "true");
  await expect(
    page.getByRole("region", { name: "Animation canvas preview", exact: true }),
  ).toHaveCount(0);
  await row.dragTo(page.getByRole("group", { name: "Haptic pattern timeline", exact: true }));
  await expect(
    page.getByRole("region", { name: "Animation canvas preview", exact: true }).locator("canvas"),
  ).toBeVisible({ timeout: 20000 });
  await expect(page.getByRole("tab", { name: "animation", exact: true })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.locator(".media-item")).toHaveCount(1);
  await page.getByRole("button", { name: "Remove from canvas", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Animation canvas preview", exact: true }),
  ).toHaveCount(0);
  await row.click({ button: "right" });
  await page.getByRole("menuitem", { name: "Add to canvas", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Animation canvas preview", exact: true }).locator("canvas"),
  ).toBeVisible({ timeout: 20000 });
  await page.reload();
  await expect(
    page.getByRole("region", { name: "Animation canvas preview", exact: true }).locator("canvas"),
  ).toBeVisible({ timeout: 20000 });
});

test("read-only media rows cannot rename, delete or attach", async ({ page, context }) => {
  await page.goto("/");
  await uploadAnimation(page);
  const viewer = await context.newPage();
  await viewer.goto(page.url());
  await expect(viewer.getByRole("textbox", { name: "Pattern name", exact: true })).toBeDisabled();
  await viewer.getByRole("button", { name: "Media", exact: true }).click();
  const row = viewer.locator(".media-item").filter({ hasText: "bounce.json" });
  await expect(row).toHaveAttribute("draggable", "false");
  await row.getByText("bounce.json", { exact: true }).dblclick();
  await expect(row.getByRole("textbox")).toHaveCount(0);
  await expect(row.getByRole("button", { name: "Remove bounce.json", exact: true })).toBeDisabled();
  await row.click({ button: "right" });
  for (const name of ["Add to canvas", "Rename", "Delete"])
    await expect(viewer.getByRole("menuitem", { name, exact: true })).toBeDisabled();
  await expect(viewer.getByRole("menuitem", { name: "Download", exact: true })).toBeEnabled();
  await viewer.close();
});

test("media audio preview plays the file without starting the editor and stops explicitly", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("tab", { name: "sound", exact: true }).click();
  await page.getByLabel("Audio file", { exact: true }).setInputFiles({
    name: "fanfaresound.mp3",
    mimeType: "audio/mpeg",
    buffer: Buffer.from(sampleAudio),
  });
  await expect(page.getByRole("img", { name: "Audio waveform", exact: true })).toBeVisible({
    timeout: 20000,
  });
  await page.getByRole("button", { name: "Media", exact: true }).click();
  const row = page.locator(".media-item").filter({ hasText: "fanfaresound.mp3" });
  await row.click({ button: "right" });
  await page.getByRole("menuitem", { name: "Play", exact: true }).click();
  await expect(row).toHaveAttribute("data-playing", "true");
  await expect(
    page.locator(".pattern-header").getByRole("button", { name: "Play", exact: true }),
  ).toBeVisible();
  await row.click({ button: "right" });
  await page.getByRole("menuitem", { name: "Stop", exact: true }).click();
  await expect(row).toHaveAttribute("data-playing", "false");
});

test("the shared context menu preserves dashboard project actions", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await page
    .locator(".project-card")
    .first()
    .getByRole("button", { name: /^Actions for / })
    .click();
  await expect(page.getByRole("menuitem", { name: "Open", exact: true })).toBeFocused();
  await page.getByRole("menuitem", { name: "Rename", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Rename project", exact: true });
  await dialog.getByRole("textbox", { name: "Project name", exact: true }).fill("Media regression");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(
    page.locator(".project-card").getByRole("button", { name: "Media regression", exact: true }),
  ).toBeVisible();
});

for (const theme of ["light", "dark"]) {
  test(`${theme} media context menu fits and remains accessible at narrow widths`, async ({
    page,
  }) => {
    await page.addInitScript((value) => localStorage.setItem("rive-haptics-theme", value), theme);
    await page.goto("/");
    const row = await uploadAnimation(page);
    for (const width of [320, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await row.click({ button: "right" });
      const menu = page.getByRole("menu");
      await expect(menu).toBeVisible();
      await menu.evaluate((element) =>
        Promise.allSettled(
          element.getAnimations({ subtree: true }).map((animation) => animation.finished),
        ),
      );
      expect(
        await menu.evaluate((element) => {
          const box = element.getBoundingClientRect();
          return (
            box.left >= 0 && box.top >= 0 && box.right <= innerWidth && box.bottom <= innerHeight
          );
        }),
      ).toBe(true);
      const accessibility = await new AxeBuilder({ page })
        .include(".context-menu")
        .include(".media-library")
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(accessibility.violations).toEqual([]);
      await page.keyboard.press("Escape");
    }
  });
}
