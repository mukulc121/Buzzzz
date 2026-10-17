import { expect, test, type Page } from "@playwright/test";
import { chartGeometry } from "../../apps/studio/src/features/composer/geometry";
import { patternTitle } from "./fixtures/pattern-title";

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.addInitScript(() => {
    localStorage.setItem("buzzzz.onboarding.seen", "true");
    const key = "buzzzz.project.chart-snippets";
    if (localStorage.getItem(key)) return;
    const now = Date.now();
    localStorage.setItem(
      key,
      JSON.stringify({
        id: "chart-snippets",
        name: "Snippet source",
        createdAt: now,
        updatedAt: now,
        revision: 0,
        project: {
          presets: [
            {
              id: "source",
              name: "Source pattern",
              pattern: {
                discretePattern: [
                  { time: 100, amplitude: 0.4, frequency: 0.3 },
                  { time: 700, amplitude: 0.8, frequency: 0.2 },
                ],
                continuousPattern: {
                  amplitude: [
                    { time: 0, value: 0.2 },
                    { time: 1000, value: 0.8 },
                    { time: 2000, value: 0 },
                  ],
                  frequency: [
                    { time: 0, value: 0.3 },
                    { time: 2000, value: 0.6 },
                  ],
                },
              },
            },
          ],
          map: {},
        },
      }),
    );
  });
  await page.goto("/studio/projects/chart-snippets");
  await expect(patternTitle(page)).toHaveText("Source pattern");
});

async function frameRange(page: Page) {
  await page.locator(".chart").click({ button: "right", position: { x: 160, y: 150 } });
  await page.getByRole("menuitem", { name: "Save range as snippet…", exact: true }).click();
  await expect(page.getByRole("slider", { name: "Snippet start", exact: true })).toHaveAttribute(
    "aria-valuenow",
    "500",
  );
  await expect(page.getByRole("slider", { name: "Snippet end", exact: true })).toHaveAttribute(
    "aria-valuenow",
    "1500",
  );
}

test("chart snippet rails capture interpolated envelopes and boundary impulses without editing the project", async ({
  page,
}) => {
  const before = await page.evaluate(() => localStorage.getItem("buzzzz.project.chart-snippets"));
  await frameRange(page);
  const bounds = await page.locator(".chart").boundingBox();
  if (!bounds) throw new Error("Chart not measured");
  const geometry = chartGeometry({ ...bounds, startMs: 0, durationMs: 2000 });
  for (const [from, to] of [
    [500, 100],
    [1500, 700],
  ]) {
    await page.mouse.move(bounds.x + geometry.x(from), bounds.y + geometry.top + 80);
    await page.mouse.down();
    await page.mouse.move(bounds.x + geometry.x(to), bounds.y + geometry.top + 80, { steps: 5 });
    await page.mouse.up();
  }
  await expect(page.getByRole("slider", { name: "Snippet start", exact: true })).toHaveAttribute(
    "aria-valuenow",
    "100",
  );
  await expect(page.getByRole("slider", { name: "Snippet end", exact: true })).toHaveAttribute(
    "aria-valuenow",
    "700",
  );
  await page.screenshot({ path: "test-results/recovery/chart-editing/snippet-rails.png" });
  await page.getByRole("button", { name: "Save snippet", exact: true }).click();
  const rename = page.getByRole("textbox", { name: "Snippet name", exact: true });
  await expect(rename).toHaveValue("Source pattern part");
  await rename.fill("Clipped range");
  await rename.press("Enter");
  const snippets = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("buzzzz.snippets.v1") ?? "[]"),
  );
  expect(snippets).toHaveLength(1);
  expect(snippets[0]).toMatchObject({
    name: "Clipped range",
    durationMs: 600,
    pattern: {
      discretePattern: [
        { time: 0, amplitude: 0.4, frequency: 0.3 },
        { time: 600, amplitude: 0.8, frequency: 0.2 },
      ],
      continuousPattern: {
        amplitude: [
          { time: 0, value: 0.26 },
          { time: 600, value: 0.62 },
        ],
        frequency: [
          { time: 0, value: 0.315 },
          { time: 600, value: 0.405 },
        ],
      },
    },
  });
  expect(await page.evaluate(() => localStorage.getItem("buzzzz.project.chart-snippets"))).toBe(
    before,
  );
  await page.reload();
  await page.getByRole("button", { name: "Tools", exact: true }).click();
  await page.getByRole("button", { name: "Snippets", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "About Clipped range", exact: true }),
  ).toBeVisible();
});

test("Escape cancels snippet framing and the tool can reopen and cancel it", async ({ page }) => {
  await frameRange(page);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("slider", { name: "Snippet start", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Tools", exact: true }).click();
  await page.getByRole("button", { name: "Snippets", exact: true }).click();
  await page.getByRole("button", { name: "Select range", exact: true }).click();
  await expect(page.getByRole("slider", { name: "Snippet start", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Cancel range", exact: true }).click();
  await expect(page.getByRole("slider", { name: "Snippet start", exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("buzzzz.snippets.v1"))).toBeNull();
});
