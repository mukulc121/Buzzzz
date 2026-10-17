import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.routeWebSocket("**/relay?role=studio", (socket) =>
    socket.send(JSON.stringify({ type: "peers", phones: 0 })),
  );
});

test("deleting the final project leaves an empty catalog through reload and history", async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem("deletion-seeded")) return;
    localStorage.clear();
    localStorage.setItem("buzzzz.onboarding.seen", "true");
    localStorage.setItem("buzzzz.lastProject", "only-project");
    localStorage.setItem(
      "buzzzz.project.only-project",
      JSON.stringify({
        id: "only-project",
        name: "Final project",
        createdAt: 1,
        updatedAt: 1,
        revision: 0,
        project: {
          presets: [
            {
              id: "only-pattern",
              name: "My pattern",
              pattern: {
                discretePattern: [],
                continuousPattern: { amplitude: [], frequency: [] },
              },
            },
          ],
          map: {},
        },
      }),
    );
    sessionStorage.setItem("deletion-seeded", "true");
  });
  await page.goto("/studio/projects/only-project");
  await expect(page.locator(".save-status")).toHaveAttribute("data-status", /editing|unlocked/);
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  const dashboard = page.getByRole("region", { name: "Projects", exact: true });
  await dashboard.getByRole("button", { name: "Actions for Final project" }).click();
  await page.getByRole("menuitem", { name: "Remove", exact: true }).click();
  await page
    .getByRole("dialog", { name: "Remove project" })
    .getByRole("button", { name: "Remove", exact: true })
    .click();
  const storedIds = () =>
    page.evaluate(() =>
      Object.keys(localStorage).filter((key) => key.startsWith("buzzzz.project.")),
    );
  await expect(dashboard.locator(".project-card")).toHaveCount(0);
  await expect(dashboard.getByText("No projects yet", { exact: true })).toBeVisible();
  expect(await storedIds()).toEqual([]);
  await expect
    .poll(() =>
      page.evaluate(async () =>
        (await navigator.locks.query()).held?.filter((lock) =>
          lock.name?.startsWith("buzzzz-project:"),
        ),
      ),
    )
    .toEqual([]);
  await page.screenshot({ path: testInfo.outputPath("last-project-removed.png") });
  await page.reload();
  await expect(dashboard.getByText("No projects yet", { exact: true })).toBeVisible();
  expect(await storedIds()).toEqual([]);
  await page.goBack();
  await expect(page).toHaveURL(/\/studio\/projects\/only-project$/);
  await expect(page.getByRole("alert")).toContainText("Project not found in this browser");
  await expect(dashboard.locator(".project-card")).toHaveCount(0);
  await page.goForward();
  await expect(dashboard.getByText("No projects yet", { exact: true })).toBeVisible();
  await page.goto("/");
  await expect(page).toHaveURL(/\/studio\/projects$/);
  await expect(dashboard.getByText("No projects yet", { exact: true })).toBeVisible();
  expect(await storedIds()).toEqual([]);
  await dashboard.getByRole("button", { name: "Create new project" }).first().click();
  const dialog = page.getByRole("dialog", { name: "Create project" });
  await dialog.getByRole("textbox", { name: "Project name" }).fill("Explicit new project");
  await dialog.getByRole("button", { name: "Create", exact: true }).click();
  await expect(page).toHaveURL(/\/studio\/projects\/[\w-]+$/);
  await expect(page.locator(".save-status")).toHaveAttribute("data-status", /editing|unlocked/);
  expect(await storedIds()).toHaveLength(1);
});

test("fresh dashboard and missing URLs do not persist an implicit project", async ({ page }) => {
  for (const path of ["/studio/projects", "/studio/projects/not-saved-here"]) {
    await page.goto(path);
    await expect(page.getByRole("region", { name: "Projects", exact: true })).toBeVisible();
    await expect(page.locator(".project-card")).toHaveCount(0);
    expect(
      await page.evaluate(() =>
        Object.keys(localStorage).filter((key) => key.startsWith("buzzzz.project.")),
      ),
    ).toEqual([]);
  }
  await expect(page.getByRole("alert")).toContainText("Project not found in this browser");
});
