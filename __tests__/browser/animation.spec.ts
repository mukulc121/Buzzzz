import { expect, test } from "@playwright/test";
import animationReference from "../../apps/studio/__tests__/fixtures/animation-reference.json" with { type: "json" };

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("buzzzz.onboarding.seen", "true");
    localStorage.setItem("buzzzz.mobile-notice-dismissed", "1");
  });
});

test("animation approach controls regenerate the selected pattern without replacing manual edits", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await page.getByRole("tab", { name: "animation", exact: true }).click();
  const scenario = animationReference.scenarios.find((item) => item.name === "spin / defaults");
  if (!scenario) throw new Error("Missing spin fixture");
  await page.getByLabel("Lottie file", { exact: true }).setInputFiles({
    name: "spin.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(scenario.source)),
  });
  const choose = async (name: string) => {
    await page.getByRole("button", { name: `Apply ${name}`, exact: true }).click();
    const replace = page.getByRole("button", { name: "Replace pattern", exact: true });
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
  ).toContainText("0 events");
  await page.locator(".animation-generation-settings > summary").click();
  await expect(page.getByRole("spinbutton", { name: "Sampling rate", exact: true })).toHaveValue(
    "240",
  );
  await page.getByRole("spinbutton", { name: "Motion smoothing", exact: true }).fill("40");
  await expect(
    page.getByRole("button", { name: "Apply Channel mapping", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
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
    await page.locator(".animation-generation-settings > summary").click();
    await page.getByLabel("Animation position", { exact: true }).fill("500");
    await expect(page.getByText("0.50 s", { exact: true })).toBeVisible();
    const canvas = preview.locator("canvas");
    const frame = () =>
      canvas.evaluate((element) => {
        if (!(element instanceof HTMLCanvasElement)) throw new Error("Missing preview canvas");
        return element.toDataURL();
      });
    const frameAtOne = await frame();
    await page.getByRole("combobox", { name: "Playback speed", exact: true }).selectOption("2");
    await page.getByLabel("Animation position", { exact: true }).fill("250");
    await expect.poll(frame).not.toBe(frameAtOne);
    await page.getByLabel("Animation position", { exact: true }).fill("500");
    await expect.poll(frame).toBe(frameAtOne);
    const apply = page
      .locator(".animation-candidates")
      .getByRole("button", { name: /^Apply/ })
      .first();
    await expect(apply).toBeEnabled();
    await apply.click();
    await page.getByRole("button", { name: "Replace pattern", exact: true }).click();
    await page.getByRole("button", { name: "Restore original", exact: true }).click();
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
  await page.getByRole("button", { name: "Show on canvas", exact: true }).click();
  await expect(preview.locator("canvas")).toBeVisible();
});
