import { expect, test, type Page } from "@playwright/test";
import animationReference from "../../apps/studio/__tests__/fixtures/animation-reference.json" with { type: "json" };

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("buzzzz.onboarding.seen", "true");
    localStorage.setItem("buzzzz.mobile-notice-dismissed", "1");
  });
});

async function seek(page: Page, time: number) {
  const cursor = page.getByRole("slider", { name: "Scrub position", exact: true });
  await cursor.focus();
  await cursor.press("Home");
  for (let index = 0; index < Math.floor(time / 100); index++)
    await cursor.press("Shift+ArrowRight");
  for (let index = 0; index < (time % 100) / 10; index++) await cursor.press("ArrowRight");
  await expect(cursor).toHaveAttribute("aria-valuenow", String(time));
}

for (const theme of ["Light", "Dark"])
  test(`${theme} animation inspector follows the published empty and loaded sections`, async ({
    page,
  }) => {
    const { default: AxeBuilder } = await import("@axe-core/playwright");
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/");
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await page.getByRole("radio", { name: theme, exact: true }).click();
    await page.getByRole("tab", { name: "animation", exact: true }).click();
    const panel = page.getByRole("region", { name: "Animation tools", exact: true });
    await expect(panel.locator("h3")).toHaveText(["No animation attached", "Generate"]);
    await expect(
      panel.getByText(
        "Drag and drop a .json or .lottie file from your computer or the Media panel.",
      ),
    ).toBeVisible();
    await expect(
      panel.getByText("Attach an animation and the approaches are derived from it for you."),
    ).toBeVisible();
    await expect(panel.getByRole("button", { name: "Add animation", exact: true })).toHaveCount(0);
    await expect(panel.getByLabel("Lottie file", { exact: true })).not.toBeVisible();
    await panel.getByRole("button", { name: "Open Media panel", exact: true }).click();
    const media = page.getByRole("region", { name: "Media library", exact: true });
    await expect(media).toBeVisible();
    await panel.getByRole("button", { name: "Open Media panel", exact: true }).click();
    await expect(media).toBeVisible();
    await panel
      .getByLabel("Lottie file", { exact: true })
      .setInputFiles("apps/preview/src/features/demos/lottie/bounce.json");
    await expect(panel.locator(".animation-candidates .audio-candidate")).toHaveCount(5);
    await expect(panel.locator("h3")).toHaveText([
      "Animation",
      "Generate",
      "Approaches",
      "Playback",
      "Layout",
    ]);
    await expect(panel.getByLabel("Animation position", { exact: true })).toHaveCount(0);
    await expect(
      panel.getByRole("button", { name: "Fullscreen preview", exact: true }),
    ).toHaveCount(0);
    await expect(panel.getByRole("spinbutton", { name: "Speed", exact: true })).toHaveValue("1.00");
    await panel.getByRole("spinbutton", { name: "Speed", exact: true }).fill("1.25");
    await expect(panel.getByRole("slider", { name: "Speed slider", exact: true })).toHaveValue(
      "1.25",
    );
    const layout = panel.getByRole("group", { name: "Animation layout", exact: true });
    await expect(layout.getByRole("button", { name: "Side by side", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await layout.getByRole("button", { name: "Stacked", exact: true }).click();
    await expect(page.getByRole("region", { name: "Animation canvas preview" })).toHaveClass(
      /stacked/,
    );
    await panel.getByRole("button", { name: "Hide preview", exact: true }).click();
    await expect(page.getByRole("region", { name: "Animation canvas preview" })).toHaveCount(0);
    await panel.getByRole("button", { name: "Show preview", exact: true }).click();
    await expect(
      page.getByRole("region", { name: "Animation canvas preview" }).locator("canvas"),
    ).toBeVisible();
    await panel.locator(".animation-generation-settings > summary").click();
    const sampling = panel.getByRole("spinbutton", { name: "Sampling rate", exact: true });
    await sampling.fill("480");
    await panel.getByRole("spinbutton", { name: "Motion smoothing", exact: true }).fill("40");
    await panel.getByRole("button", { name: "Reset to defaults", exact: true }).click();
    await expect(sampling).toHaveValue("240");
    await expect(
      panel.getByRole("spinbutton", { name: "Motion smoothing", exact: true }),
    ).toHaveValue("12");
    expect(
      (
        await new AxeBuilder({ page })
          .include(".animation-panel")
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    await panel.getByRole("button", { name: "Remove from canvas", exact: true }).click();
    await expect(panel.locator("h3")).toHaveText(["No animation attached", "Generate"]);
  });

test("animation approach controls regenerate the selected pattern without replacing manual edits", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await page.getByRole("tab", { name: "animation", exact: true }).click();
  const scenario = animationReference.scenarios.find((item) => item.name === "spin / defaults");
  if (!scenario) throw new Error("Missing spin fixture");
  await page.getByLabel("Lottie file", { exact: true }).setInputFiles({
    name: "spin.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        ...scenario.source,
        layers: scenario.source.layers.map((layer) => ({ ...layer, shapes: [] })),
      }),
    ),
  });
  const choose = async (name: string) => {
    await page.getByRole("button", { name: `Apply ${name}`, exact: true }).click();
    const replace = page.getByRole("button", { name: "Discard", exact: true });
    if (await replace.isVisible()) await replace.click();
  };
  await expect(page.locator(".animation-candidates .audio-candidate")).toHaveCount(5);
  await choose("Hybrid (energy + impacts)");
  const amplitude = page.locator('.chart [data-envelope="amplitude"]');
  const original = await amplitude.getAttribute("points");
  await page.getByRole("spinbutton", { name: "Envelope gain", exact: true }).fill("0.5");
  await expect(amplitude).not.toHaveAttribute("points", original ?? "");
  await expect(
    page.getByRole("button", { name: "Apply Hybrid (energy + impacts)", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  const firstPoint = page.getByRole("button", { name: /^Intensity point/ }).first();
  await firstPoint.focus();
  await firstPoint.press("ArrowDown");
  const manual = await amplitude.getAttribute("points");
  await page.getByRole("spinbutton", { name: "Envelope gain", exact: true }).fill("0.6");
  await expect(amplitude).toHaveAttribute("points", manual ?? "");
  await choose("Channel mapping");
  await expect(
    page.getByRole("spinbutton", { name: "Rotation detents / turn", exact: true }),
  ).toHaveValue("4");
  await page.getByRole("spinbutton", { name: "Rotation detents / turn", exact: true }).fill("0");
  await expect(
    page
      .locator(".animation-candidates .audio-candidate")
      .filter({ has: page.getByRole("button", { name: "Apply Channel mapping", exact: true }) }),
  ).not.toContainText("events");
  await page.locator(".animation-generation-settings > summary").click();
  await expect(page.getByRole("spinbutton", { name: "Sampling rate", exact: true })).toHaveValue(
    "240",
  );
  await page.getByRole("spinbutton", { name: "Motion smoothing", exact: true }).fill("40");
  await expect(
    page.getByRole("button", { name: "Apply Channel mapping", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Reset to defaults", exact: true }).click();
  await expect(
    page.getByRole("spinbutton", { name: "Rotation detents / turn", exact: true }),
  ).toHaveValue("4");
  expect(errors).toEqual([]);
});

test("animation analysis reports the real worker error and retries without reattaching", async ({
  page,
}) => {
  let attempts = 0;
  await page.route(/\/src\/features\/animation\/analysis\.worker\.ts(?:\?.*)?$/, async (route) => {
    attempts++;
    if (attempts === 1)
      await route.fulfill({
        contentType: "application/javascript",
        body: `self.addEventListener("message", () => self.postMessage({ error: "Motion worker stopped." }));`,
      });
    else await route.continue();
  });
  await page.goto("/");
  await page.getByRole("tab", { name: "animation", exact: true }).click();
  const panel = page.getByRole("region", { name: "Animation tools", exact: true });
  await panel
    .getByLabel("Lottie file", { exact: true })
    .setInputFiles("apps/preview/src/features/demos/lottie/bounce.json");
  await expect(panel.getByRole("alert")).toHaveText("Motion worker stopped.");
  await expect(page.getByRole("alert")).toHaveCount(1);
  await panel.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(panel.locator(".animation-candidates .audio-candidate")).toHaveCount(5);
  await expect(panel.getByRole("alert")).toHaveCount(0);
  await expect(panel.getByRole("button", { name: "Try again", exact: true })).toHaveCount(0);
  await expect(panel.locator("dd").first()).toHaveText("bounce.json");
  expect(attempts).toBe(2);
});

for (const width of [390, 1440])
  test(`Lottie preview, generation and persisted attachment at ${width}px`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.routeWebSocket("**/relay?role=studio", (socket) =>
      socket.send(JSON.stringify({ type: "peers", phones: 0 })),
    );
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");
    await page.getByRole("tab", { name: "animation", exact: true }).click();
    await page
      .getByLabel("Lottie file", { exact: true })
      .setInputFiles("apps/preview/src/features/demos/lottie/bounce.json");
    const preview = page.getByRole("region", { name: "Animation canvas preview" });
    await expect(preview.locator("canvas")).toBeVisible({ timeout: 20000 });
    await expect(page.locator(".animation-candidates .audio-candidate")).toHaveCount(5);
    await page.getByRole("button", { name: "Play animation", exact: true }).click();
    await expect(page.getByRole("button", { name: "Pause animation", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Pause animation", exact: true }).click();
    await seek(page, 500);
    const canvas = preview.locator("canvas");
    const frame = () =>
      canvas.evaluate((element) => {
        if (!(element instanceof HTMLCanvasElement)) throw new Error("Missing preview canvas");
        return element.toDataURL();
      });
    const frameAtOne = await frame();
    await page.getByRole("spinbutton", { name: "Speed", exact: true }).fill("2");
    await seek(page, 250);
    await expect.poll(frame).not.toBe(frameAtOne);
    await seek(page, 500);
    await expect.poll(frame).toBe(frameAtOne);
    const apply = page
      .locator(".animation-candidates")
      .getByRole("button", { name: /^Apply/ })
      .first();
    await expect(apply).toBeEnabled();
    await apply.click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.getByRole("button", { name: "Restore my pattern", exact: true }).click();
    await page.reload();
    await expect(
      page.getByRole("region", { name: "Animation canvas preview" }).locator("canvas"),
    ).toBeVisible({ timeout: 20000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
      false,
    );
    expect(errors).toEqual([]);
  });

test("animation preview layouts, floating movement and hide/show keep a live canvas", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await page.getByRole("tab", { name: "animation", exact: true }).click();
  await page
    .getByLabel("Lottie file", { exact: true })
    .setInputFiles("apps/preview/src/features/demos/lottie/bounce.json");
  const preview = page.getByRole("region", { name: "Animation canvas preview" });
  await expect(preview.locator("canvas")).toBeVisible();
  await expect(preview.getByRole("button", { name: "Side by side", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  const chart = page.locator(".chart-card");
  const chartBounds = await chart.boundingBox();
  const previewBounds = await preview.boundingBox();
  if (!chartBounds || !previewBounds) throw new Error("Missing editor panes");
  expect(previewBounds.x).toBeGreaterThan(chartBounds.x);
  expect(previewBounds.y).toBeCloseTo(chartBounds.y, 0);
  expect(previewBounds.height).toBeGreaterThan(400);
  await preview.getByRole("button", { name: "Stacked", exact: true }).click();
  await expect(preview).toHaveClass(/stacked/);
  await preview.getByRole("button", { name: "Floating preview", exact: true }).click();
  await expect(preview).toHaveClass(/floating/);
  const title = preview.getByRole("button", { name: "Move bounce.json preview", exact: true });
  await title.focus();
  const before = await preview.boundingBox();
  await title.press("ArrowLeft");
  const after = await preview.boundingBox();
  expect(after!.x).toBeCloseTo(before!.x - 10, 0);
  await page.setViewportSize({ width: 390, height: 800 });
  await expect.poll(async () => (await preview.boundingBox())!.x).toBeGreaterThanOrEqual(0);
  await expect
    .poll(async () => {
      const bounds = await preview.boundingBox();
      return bounds!.x + bounds!.width;
    })
    .toBeLessThanOrEqual(390);
  await title.press("Escape");
  await expect(preview).toHaveClass(/side-by-side/);
  await preview.getByRole("button", { name: "Hide animation preview", exact: true }).click();
  await expect(preview).toHaveCount(0);
  await page.getByRole("button", { name: "Show preview", exact: true }).click();
  await expect(preview.locator("canvas")).toBeVisible();
});
