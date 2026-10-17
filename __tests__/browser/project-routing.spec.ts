import { patternTitle, renamePattern } from "./fixtures/pattern-title";
import { expect, test, type Page } from "@playwright/test";

const dashboard = (page: Page) => page.getByRole("region", { name: "Projects", exact: true });

async function showProjects(page: Page) {
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await expect(page).toHaveURL(/\/studio\/projects(?:[?#]|$)/);
  await expect(dashboard(page)).toBeVisible();
}

async function createProject(page: Page, name: string, pattern: string) {
  await dashboard(page)
    .locator("header")
    .getByRole("button", { name: "Create new project" })
    .click();
  const dialog = page.getByRole("dialog", { name: "Create project" });
  await dialog.getByRole("textbox", { name: "Project name" }).fill(name);
  await dialog.getByRole("button", { name: "Create", exact: true }).click();
  await expect(page).toHaveURL(/\/studio\/projects\/[\w-]+(?:[?#]|$)/);
  await expect(page.locator(".save-status")).toHaveAttribute("data-status", /editing|unlocked/);
  await expect(patternTitle(page)).toHaveText("Untitled pattern");
  await expect(
    page.getByRole("group", { name: "Haptic pattern timeline" }).getByRole("button"),
  ).toHaveCount(0);
  await renamePattern(page, pattern);
  await expect(patternTitle(page)).toHaveText(pattern);
  return page.url();
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("buzzzz.onboarding.seen", "true"));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.routeWebSocket("**/relay?role=studio", (socket) => {
    socket.send(JSON.stringify({ type: "peers", phones: 0 }));
  });
});

test("project URLs select saved A/B through reload and browser history", async ({ page }) => {
  await page.goto("/studio/projects?preset=tap#relay-bootstrap");
  const a = await createProject(page, "Route A", "A pattern");
  expect(new URL(a).searchParams.get("preset")).toBe("tap");
  expect(new URL(a).searchParams.get("pattern")).toBeTruthy();
  expect(new URL(a).hash).toBe("#relay-bootstrap");
  await showProjects(page);
  const b = await createProject(page, "Route B", "B pattern");
  expect(a).not.toBe(b);
  await showProjects(page);
  await dashboard(page).getByRole("button", { name: "Route A", exact: true }).click();
  await expect(page).toHaveURL(a);
  await expect(patternTitle(page)).toHaveText("A pattern");
  await page.reload();
  await expect(page).toHaveURL(a);
  await expect(patternTitle(page)).toHaveText("A pattern");
  await page.goBack();
  await expect(dashboard(page)).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(b);
  await expect(patternTitle(page)).toHaveText("B pattern");
  await page.goForward();
  await expect(dashboard(page)).toBeVisible();
  await page.goForward();
  await expect(page).toHaveURL(a);
  await expect(patternTitle(page)).toHaveText("A pattern");
  await page.goBack();
  await page.goBack();
  await expect(patternTitle(page)).toHaveText("B pattern");
  await page.goto(a);
  await expect(patternTitle(page)).toHaveText("A pattern");
  await page.screenshot({ path: "/tmp/buzzzz-routing-results/project-a.png" });
});

test("missing and malformed local IDs visibly show the dashboard without inventing a project", async ({
  page,
  browser,
}) => {
  await page.goto("/studio/projects");
  const a = await createProject(page, "Local only", "Local pattern");
  const other = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  try {
    await other.addInitScript(() => localStorage.setItem("buzzzz.onboarding.seen", "true"));
    const fresh = await other.newPage();
    await fresh.routeWebSocket("**/relay?role=studio", (socket) =>
      socket.send(JSON.stringify({ type: "peers", phones: 0 })),
    );
    await fresh.goto(a);
    await expect(fresh.getByRole("alert")).toContainText("Project not found in this browser");
    await expect(dashboard(fresh)).toBeVisible();
    await expect(patternTitle(fresh)).toHaveCount(0);
  } finally {
    await other.close();
  }
  for (const path of ["/studio/projects/missing-local-id", "/studio/projects/bad%25id"]) {
    await page.goto(path);
    await expect(page.getByRole("alert")).toContainText("Project not found in this browser");
    await expect(dashboard(page)).toBeVisible();
    await expect(patternTitle(page)).toHaveCount(0);
  }
  expect(
    await page.evaluate(() => localStorage.getItem("buzzzz.project.missing-local-id")),
  ).toBeNull();
  await page.screenshot({ path: "/tmp/buzzzz-routing-results/missing-project.png" });
});

test("removing the current project keeps the dashboard and history cannot reopen deleted content", async ({
  page,
}) => {
  await page.goto("/studio/projects");
  await createProject(page, "Keep B", "B pattern");
  await showProjects(page);
  const a = await createProject(page, "Remove A", "A pattern");
  await showProjects(page);
  await dashboard(page).getByRole("button", { name: "Actions for Remove A" }).click();
  await page.getByRole("menuitem", { name: "Remove", exact: true }).click();
  await page
    .getByRole("dialog", { name: "Remove project" })
    .getByRole("button", { name: "Remove", exact: true })
    .click();
  await expect(page.getByRole("alert")).toHaveText("Project removed from this browser.");
  await expect(dashboard(page)).toBeVisible();
  await expect(dashboard(page).getByRole("button", { name: "Remove A", exact: true })).toHaveCount(
    0,
  );
  await page.goBack();
  await expect(page).toHaveURL(a);
  await expect(page.getByRole("alert")).toContainText("Project not found in this browser");
  await expect(patternTitle(page)).toHaveCount(0);
  await dashboard(page).getByRole("button", { name: "Keep B", exact: true }).click();
  await expect(patternTitle(page)).toHaveText("B pattern");
});

test("incoming hosted share URLs keep their query/hash and relay bootstraps at the origin", async ({
  page,
}) => {
  const sockets: string[] = [];
  await page.routeWebSocket("**/relay?role=studio", (socket) => {
    sockets.push(socket.url());
    socket.send(JSON.stringify({ type: "peers", phones: 0 }));
  });
  const room = "a".repeat(32);
  const id = "b".repeat(32);
  const token = "t".repeat(43);
  const path = `/studio/projects/a-local-id?shareRoom=${room}&shareId=${id}&shareToken=${token}#relay-bootstrap`;
  await page.goto(path);
  await expect(patternTitle(page)).toBeVisible();
  await expect(page).toHaveURL(`http://127.0.0.1:5173${path}`);
  await expect(page.getByText("Project not found in this browser", { exact: false })).toHaveCount(
    0,
  );
  await expect.poll(() => sockets.some((url) => new URL(url).pathname === "/relay")).toBe(true);
  await page.reload();
  await expect(patternTitle(page)).toBeVisible();
  await expect(page).toHaveURL(`http://127.0.0.1:5173${path}`);
  expect(await page.evaluate(() => localStorage.getItem("buzzzz.project.a-local-id"))).toBeNull();
});
