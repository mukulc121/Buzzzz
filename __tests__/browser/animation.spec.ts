import { expect, test } from "@playwright/test";
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
    await page.getByLabel("Animation position", { exact: true }).fill("500");
    await expect(preview.getByText("0.50 s", { exact: true })).toBeVisible();
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
      .locator(".animation-candidates button")
      .filter({ hasText: /^Apply/ })
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
