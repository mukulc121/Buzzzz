import { expect, test, type Page } from "@playwright/test";
import { emptyPattern } from "@buzzzz/core";
import { patternTitle } from "./fixtures/pattern-title";

const PROJECT_A = "pattern-route-a";
const PROJECT_B = "pattern-route-b";

async function seed(page: Page) {
  await page.addInitScript(
    ({ a, b }) => {
      if (sessionStorage.getItem("pattern-routes.seeded")) return;
      sessionStorage.setItem("pattern-routes.seeded", "true");
      localStorage.setItem("buzzzz.onboarding.seen", "true");
      localStorage.setItem("buzzzz.lastProject", b.id);
      localStorage.setItem(`buzzzz.project.${a.id}`, JSON.stringify(a));
      localStorage.setItem(`buzzzz.project.${b.id}`, JSON.stringify(b));
      localStorage.setItem(`buzzzz.selectedPattern.${a.id}`, "a-second");
      localStorage.setItem(`buzzzz.selectedPattern.${b.id}`, "b-second");
    },
    {
      a: record(PROJECT_A, "Project A", ["a-first", "a-second", "a-third"]),
      b: record(PROJECT_B, "Project B", ["b-first", "b-second"]),
    },
  );
  await page.routeWebSocket("**/relay?role=studio", (socket) =>
    socket.send(JSON.stringify({ type: "peers", phones: 0 })),
  );
}

function record(id: string, name: string, ids: string[]) {
  return {
    id,
    name,
    createdAt: 1,
    updatedAt: 1,
    revision: 0,
    project: { presets: ids.map((id) => ({ id, name: id, pattern: emptyPattern() })), map: {} },
  };
}

function select(page: Page, name: string) {
  return page
    .getByRole("complementary", { name: "Project patterns", exact: true })
    .getByRole("button", { name, exact: true })
    .click();
}

const selection = (page: Page) => new URL(page.url()).searchParams.get("pattern");

test.beforeEach(async ({ page }) => {
  await seed(page);
});

test("direct pattern URLs beat other-project and per-project preferences, survive refresh and follow history", async ({
  page,
}) => {
  await page.goto(`/studio/projects/${PROJECT_A}?pattern=a-first&relay=kept#phone`);
  await expect(patternTitle(page)).toHaveText("a-first");
  await expect(page.locator(".save-status")).toHaveAttribute("data-status", /editing|unlocked/);
  const revision = await page.evaluate(
    (id) => JSON.parse(localStorage.getItem(`buzzzz.project.${id}`) ?? "null").revision,
    PROJECT_A,
  );
  await select(page, "a-third");
  expect(selection(page)).toBe("a-third");
  expect(new URL(page.url()).searchParams.get("relay")).toBe("kept");
  expect(new URL(page.url()).hash).toBe("#phone");
  await page.reload();
  await expect(patternTitle(page)).toHaveText("a-third");
  await page.goBack();
  await expect(patternTitle(page)).toHaveText("a-first");
  expect(selection(page)).toBe("a-first");
  await page.goForward();
  await expect(patternTitle(page)).toHaveText("a-third");
  expect(
    await page.evaluate(
      (id) => JSON.parse(localStorage.getItem(`buzzzz.project.${id}`) ?? "null").revision,
      PROJECT_A,
    ),
  ).toBe(revision);
});

test("opening plain project paths remembers selection independently for projects with different pattern IDs", async ({
  page,
}) => {
  await page.goto(`/studio/projects/${PROJECT_A}`);
  await expect(patternTitle(page)).toHaveText("a-second");
  expect(selection(page)).toBe("a-second");
  await select(page, "a-third");
  await page.goto(`/studio/projects/${PROJECT_B}`);
  await expect(patternTitle(page)).toHaveText("b-second");
  expect(selection(page)).toBe("b-second");
  await select(page, "b-first");
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  expect(selection(page)).toBeNull();
  await page.getByRole("button", { name: "Project A", exact: true }).click();
  await expect(patternTitle(page)).toHaveText("a-third");
  expect(selection(page)).toBe("a-third");
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await page.getByRole("button", { name: "Project B", exact: true }).click();
  await expect(patternTitle(page)).toHaveText("b-first");
  expect(selection(page)).toBe("b-first");
});

test("invalid and removed pattern IDs canonicalize safely and never create a missing project", async ({
  page,
}) => {
  await page.goto(`/studio/projects/${PROJECT_A}?pattern=gone&other=kept#fragment`);
  await expect(patternTitle(page)).toHaveText("a-first");
  await expect.poll(() => selection(page)).toBe("a-first");
  expect(new URL(page.url()).searchParams.get("other")).toBe("kept");
  expect(new URL(page.url()).hash).toBe("#fragment");
  await select(page, "a-third");
  const row = page
    .locator(".pattern-list li")
    .filter({ has: page.getByRole("button", { name: "a-third", exact: true }) });
  await row.click({ button: "right" });
  await page.getByRole("menuitem", { name: "Remove", exact: true }).click();
  await expect(patternTitle(page)).toHaveText("a-first");
  await expect.poll(() => selection(page)).toBe("a-first");
  await page.goBack();
  await expect(patternTitle(page)).toHaveText("a-first");
  expect(selection(page)).toBe("a-first");
  await page.goto("/studio/projects/missing-project?pattern=a-first#fragment");
  await expect(page.getByRole("alert")).toContainText("Project not found in this browser");
  expect(
    await page.evaluate(() => localStorage.getItem("buzzzz.project.missing-project")),
  ).toBeNull();
});

test("opening the current project from the dashboard adopts its remembered pattern consistently", async ({
  page,
}) => {
  await page.goto(`/studio/projects/${PROJECT_A}?pattern=a-first`);
  await expect(patternTitle(page)).toHaveText("a-first");
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await page.evaluate(
    (id) => localStorage.setItem(`buzzzz.selectedPattern.${id}`, "a-third"),
    PROJECT_A,
  );
  await page.getByRole("button", { name: "Project A", exact: true }).click();
  await expect(patternTitle(page)).toHaveText("a-third");
  expect(selection(page)).toBe("a-third");
});
