import { patternTitle } from "./fixtures/pattern-title";
import { expect, test, type Page } from "@playwright/test";

const pattern = (taps: number[]) => ({
  discretePattern: taps.map((time) => ({ time, amplitude: 0.8, frequency: 0.5 })),
  continuousPattern: {
    amplitude: [
      { time: 0, value: 0.6 },
      { time: 400, value: 0 },
    ],
    frequency: [
      { time: 0, value: 0.4 },
      { time: 400, value: 0.1 },
    ],
  },
});
const record = (id: string, name: string, updatedAt: number, presets: string[]) => ({
  id,
  name,
  createdAt: 1,
  updatedAt,
  revision: 0,
  project: {
    presets: presets.map((preset, index) => ({
      id: `${id}-${index}`,
      name: preset,
      pattern: pattern([0, 100 * (index + 1)]),
    })),
    map: {},
  },
});
const seedProjects = () => [
  record("checkout", "Checkout Flow", Date.now() - 60_000, [
    "Tap",
    "Buzz",
    "Pulse",
    "Rise",
    "Fade",
    "Six",
  ]),
  record("game", "Game feedback", Date.now() - 12 * 60_000, ["Hit", "Miss"]),
];

async function openDashboard(page: Page) {
  await page.routeWebSocket("**/relay?role=studio", (socket) =>
    socket.send(JSON.stringify({ type: "peers", phones: 0 })),
  );
  await page.addInitScript((seed) => {
    if (sessionStorage.getItem("projects-seeded")) return;
    localStorage.clear();
    localStorage.setItem("buzzzz.onboarding.seen", "true");
    for (const item of seed)
      localStorage.setItem(`buzzzz.project.${item.id}`, JSON.stringify(item));
    localStorage.setItem("buzzzz.lastProject", "checkout");
    sessionStorage.setItem("projects-seeded", "yes");
  }, seedProjects());
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/studio/projects");
  const dashboard = page.getByRole("region", { name: "Projects", exact: true });
  await expect(dashboard).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(async () =>
        (await navigator.locks.query()).held?.some(
          (lock) => lock.name === "buzzzz-project:checkout",
        ),
      ),
    )
    .toBe(true);
  return dashboard;
}
const card = (page: Page, name: string) =>
  page.locator(".project-card").filter({ has: page.getByRole("button", { name, exact: true }) });

test("projects open as a full page with Pulsar's cards", async ({ page }) => {
  const dashboard = await openDashboard(page);
  await expect(dashboard.getByRole("heading", { name: "Projects", level: 1 })).toBeVisible();
  await expect(
    dashboard.getByText("Design, preview, and manage your haptic patterns."),
  ).toBeVisible();
  await expect(page.locator(".workspace-sidebar")).toHaveCount(0);
  await expect(page.getByRole("group", { name: "Haptic pattern timeline" })).toHaveCount(0);
  const box = await dashboard.boundingBox();
  expect(box!.width).toBeGreaterThan(900);
  const checkout = card(page, "Checkout Flow");
  await expect(checkout.locator(".project-card-tile")).toHaveCount(5);
  await expect(checkout.locator(".project-card-overflow")).toHaveText("+1");
  await expect(checkout).toContainText(/6 patterns\s*·\s*Edited 1 min ago/);
  await expect(card(page, "Game feedback")).toContainText(/2 patterns\s*·\s*Edited 12 min ago/);
  const names = () => dashboard.locator(".project-card-open").allTextContents();
  expect(await names()).toEqual(["Checkout Flow", "Game feedback"]);
  await dashboard.getByRole("combobox", { name: "Sort projects" }).click();
  await page.getByRole("option", { name: "Name" }).click();
  expect(await names()).toEqual(["Checkout Flow", "Game feedback"]);
  await dashboard.getByRole("searchbox").fill("zzz");
  await expect(dashboard.getByText("No projects match “zzz”")).toBeVisible();
  await dashboard.getByRole("button", { name: "Clear search", exact: true }).last().click();
  await expect(dashboard.locator(".project-card")).toHaveCount(2);
  await page.screenshot({ path: "/tmp/buzzzz-projects-results/dashboard.png" });
});

test("card menu renames and removes through dialogs", async ({ page }) => {
  const dashboard = await openDashboard(page);
  await dashboard.getByRole("button", { name: "Actions for Game feedback" }).click();
  const menu = page.getByRole("menu");
  const items = await menu.getByRole("menuitem").allTextContents();
  expect(items).toEqual(["Open", "Rename", "Remove"]);
  const rename = menu.getByRole("menuitem", { name: "Rename" });
  expect((await rename.boundingBox())!.height).toBeLessThan(44);
  await rename.click();
  const dialog = page.getByRole("dialog", { name: "Rename project" });
  await expect(dialog.getByRole("button", { name: "Save" })).toBeDisabled();
  await dialog.getByRole("textbox", { name: "Project name" }).fill("");
  await expect(dialog.getByText("Name can’t be empty.")).toBeVisible();
  await dialog.getByRole("textbox", { name: "Project name" }).fill("Arcade hits");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(card(page, "Arcade hits")).toBeVisible();
  await dashboard.getByRole("button", { name: "Actions for Arcade hits" }).click();
  await page.getByRole("menuitem", { name: "Remove" }).click();
  const confirm = page.getByRole("dialog", { name: "Remove project" });
  await expect(confirm).toContainText("Are you sure you want to remove Arcade hits?");
  await confirm.getByRole("button", { name: "Remove" }).click();
  await expect(card(page, "Arcade hits")).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("buzzzz.project.game"))).toBeNull();
});

test("create opens the new project in the editor", async ({ page }) => {
  const dashboard = await openDashboard(page);
  await dashboard.getByRole("button", { name: "Create new project" }).click();
  const dialog = page.getByRole("dialog", { name: "Create project" });
  await dialog.getByRole("textbox", { name: "Project name" }).fill("Onboarding tour");
  await dialog.getByRole("button", { name: "Create" }).click();
  await expect(page).toHaveURL(/\/studio\/projects\/[\w-]+(?:[?#]|$)/);
  await expect(patternTitle(page)).toBeVisible();
  await expect(patternTitle(page)).toHaveText("Untitled pattern");
  await expect(
    page.getByRole("group", { name: "Haptic pattern timeline" }).getByRole("button"),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await expect(
    card(page, "Onboarding tour").getByRole("button", { name: "Onboarding tour", exact: true }),
  ).toHaveAttribute("aria-current", "true");
  await card(page, "Checkout Flow")
    .getByRole("button", { name: "Checkout Flow", exact: true })
    .click();
  await expect(patternTitle(page)).toHaveText("Tap");
});

test("import rejects files that are not .pulsar", async ({ page }) => {
  const dashboard = await openDashboard(page);
  const chooser = page.waitForEvent("filechooser");
  await dashboard.getByRole("button", { name: "Import from file" }).click();
  await (
    await chooser
  ).setFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("x") });
  await expect(dashboard.getByRole("alert")).toHaveText("Choose a .pulsar file to import.");
});

test("dragging a pattern tile copies it and its audio into another project", async ({ page }) => {
  const dashboard = await openDashboard(page);
  await page.evaluate(async () => {
    const path = "/src/features/media/repository.ts";
    const media = await import(path);
    const item = await media.addMedia({
      projectId: "game",
      kind: "audio",
      file: new File(["miss audio"], "miss.wav", { type: "audio/wav" }),
    });
    await media.attachMedia({ projectId: "game", presetId: "game-1", assetId: item.id });
    await media.setMediaTrim({
      projectId: "game",
      presetId: "game-1",
      kind: "audio",
      trim: { startMs: 10, endMs: 90 },
    });
  });
  const tile = card(page, "Game feedback").locator(".project-card-tile").nth(1);
  await expect(tile).toHaveAttribute("title", "Miss - drag onto another project to copy it there");
  await tile.dragTo(card(page, "Checkout Flow").locator(".project-card-body"));
  await expect(card(page, "Checkout Flow")).toContainText("7 patterns");
  const copied = await page.evaluate(async () => {
    const path = "/src/features/media/repository.ts";
    const media = await import(path);
    const stored = JSON.parse(localStorage.getItem("buzzzz.project.checkout")!);
    const preset = stored.project.presets.at(-1);
    const attachments = await media.listAttachments("checkout", preset.id);
    return {
      name: preset.name,
      attachments: attachments.map((item: { kind: string; trim: unknown }) => [
        item.kind,
        item.trim,
      ]),
    };
  });
  expect(copied).toEqual({ name: "Miss", attachments: [["audio", { startMs: 10, endMs: 90 }]] });
  await expect(dashboard.locator(".project-card")).toHaveCount(2);
});
