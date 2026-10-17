import { expect, test, type Page } from "@playwright/test";

async function openRive(page: Page) {
  let mounts = 0;
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    localStorage.setItem("buzzzz.mobile-notice-dismissed", "1");
    const Native = window.AudioContext;
    window.AudioContext = class extends Native {
      constructor(options?: AudioContextOptions) {
        super(options);
        const mute = this.createGain();
        mute.gain.value = 0;
        mute.connect(this.destination);
        Object.defineProperty(this, "destination", { value: mute });
      }
    };
  });
  await page.exposeFunction("__previewMounted", () => mounts++);
  await page.route(/\/src\/features\/rive\/useRive\.ts(?:\?.*)?$/, async (route) => {
    const response = await route.fetch();
    const source = await response.text();
    if (!source.includes("mountHaptics();")) throw new Error("Missing actual scene mount");
    await route.fulfill({
      response,
      body: source.replace("mountHaptics();", "globalThis.__previewMounted(); mountHaptics();"),
    });
  });
  await page.route(/\/src\/features\/rive\/useRiveHaptics\.ts(?:\?.*)?$/, async (route) => {
    const response = await route.fetch();
    const source = await response.text();
    if (!source.includes("controller.current = script;")) throw new Error("Missing actual clock");
    await route.fulfill({
      response,
      body: source.replace(
        "controller.current = script;",
        "controller.current = script; globalThis.__previewElapsed = () => script.elapsedMs();",
      ),
    });
  });
  await page.routeWebSocket("**/relay?role=studio", (socket) =>
    socket.send(JSON.stringify({ type: "peers", phones: 0 })),
  );
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto("/");
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await page.getByRole("button", { name: "Create sample project", exact: true }).click();
  await page.getByRole("button", { name: "DexTourLoader", exact: true }).click();
  await page.getByRole("tab", { name: "animation", exact: true }).click();
  const inspector = page.locator(".rive-inspector");
  await expect(inspector.getByRole("button", { name: "Fire isLoaded", exact: true })).toBeVisible();
  const preview = page.locator(".rive-panel");
  await expect(preview.locator("canvas")).toBeVisible();
  await expect.poll(() => mounts).toBe(1);
  return { preview, inspector, mounts: () => mounts, errors };
}

async function elapsed(page: Page) {
  return page.evaluate(() => {
    const read: unknown = Reflect.get(globalThis, "__previewElapsed");
    if (typeof read !== "function") throw new Error("Missing actual Rive clock");
    const value: unknown = read();
    if (typeof value !== "number") throw new Error("Rive clock has not mounted");
    return value;
  });
}

test("Rive uses the shared preview pane without remounting its canvas or resetting its clock", async ({
  page,
}, testInfo) => {
  const clockStart = new Date("2030-01-01T00:00:00Z");
  await page.clock.install({ time: clockStart });
  const { preview, inspector, mounts, errors } = await openRive(page);
  await page.clock.pauseAt(new Date(clockStart.getTime() + 60_000));
  const canvas = await preview.locator("canvas").elementHandle();
  if (!canvas) throw new Error("Missing real Rive canvas");
  const sameCanvas = () =>
    canvas.evaluate((original) => original === document.querySelector(".rive-panel canvas"));
  const chart = await page.locator(".chart-card").boundingBox();
  const initial = await preview.boundingBox();
  if (!chart || !initial) throw new Error("Missing editor panes");
  expect(initial.x).toBeGreaterThanOrEqual(chart.x + chart.width);
  expect(initial.y).toBeCloseTo(chart.y, 0);
  expect(initial.height).toBeGreaterThan(400);
  await expect(preview).toHaveClass(/side-by-side/);
  await expect(preview.getByRole("button", { name: "Fire isLoaded", exact: true })).toHaveCount(0);

  await inspector.getByRole("button", { name: "Play with haptics", exact: true }).click();
  await expect.poll(mounts).toBe(2);
  await expect
    .poll(async () => {
      await page.clock.runFor(16);
      return preview.getByRole("button", { name: "Pause animation", exact: true }).isVisible();
    })
    .toBe(true);
  await preview.getByRole("button", { name: "Pause animation", exact: true }).click();
  const pausedAt = await elapsed(page);
  await preview.getByRole("button", { name: "Stacked", exact: true }).click();
  const stacked = await preview.boundingBox();
  const stackedChart = await page.locator(".chart-card").boundingBox();
  if (!stacked || !stackedChart) throw new Error("Missing stacked panes");
  expect(stacked.y).toBeGreaterThanOrEqual(stackedChart.y + stackedChart.height);
  await preview.getByRole("button", { name: "Floating preview", exact: true }).click();
  const title = preview.getByRole("button", {
    name: "Move dexHeadoutIntegration.riv preview",
    exact: true,
  });
  await title.focus();
  const before = await preview.boundingBox();
  await title.press("ArrowLeft");
  const after = await preview.boundingBox();
  expect(after!.x).toBeCloseTo(before!.x - 10, 0);
  await preview.getByRole("button", { name: "Fullscreen Rive preview", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => document.fullscreenElement?.className))
    .toContain("rive-panel");
  const fullscreen = await preview.boundingBox();
  expect(fullscreen).toMatchObject({ x: 0, y: 0, width: 1600, height: 1000 });
  await preview.getByRole("button", { name: "Exit fullscreen Rive preview", exact: true }).click();
  await expect.poll(() => page.evaluate(() => document.fullscreenElement)).toBeNull();
  await expect(preview).toHaveClass(/floating/);
  await expect.poll(sameCanvas).toBe(true);
  expect(mounts()).toBe(2);
  expect(await elapsed(page)).toBe(pausedAt);

  await title.press("Escape");
  await expect(preview).toHaveClass(/side-by-side/);
  await preview.getByRole("button", { name: "Hide animation preview", exact: true }).click();
  await expect(preview).toBeHidden();
  await expect(preview.locator("canvas")).toHaveCount(1);
  await inspector.getByRole("button", { name: "Show preview", exact: true }).click();
  await expect(preview).toBeVisible();
  expect(await sameCanvas()).toBe(true);
  expect(mounts()).toBe(2);
  expect(await elapsed(page)).toBe(pausedAt);
  await preview.getByRole("button", { name: "Play animation", exact: true }).click();
  await page.clock.runFor(150);
  expect(await elapsed(page)).toBeGreaterThanOrEqual(pausedAt + 150);
  await preview.getByRole("button", { name: "Hide animation preview", exact: true }).click();
  const hiddenAt = await elapsed(page);
  await page.clock.runFor(150);
  expect(await elapsed(page)).toBeGreaterThanOrEqual(hiddenAt + 150);
  await inspector.getByRole("button", { name: "Show preview", exact: true }).click();
  expect(await sameCanvas()).toBe(true);
  expect(mounts()).toBe(2);
  expect(errors).toEqual([]);
  await testInfo.attach("shared-rive-pane", {
    body: JSON.stringify({ initial, chart, stacked, fullscreen, pausedAt, mounts: mounts() }),
    contentType: "application/json",
  });
  await page.screenshot({ path: testInfo.outputPath("side-by-side.png") });
});

test("the Rive inspector stays scoped to its owner and preserves trigger mapping", async ({
  page,
}) => {
  const { preview, inspector, errors } = await openRive(page);
  const mapping = inspector.getByRole("combobox", { name: "Pattern for isLoaded", exact: true });
  await mapping.selectOption({ label: "JustHaptics" });
  await page.getByRole("button", { name: "JustHaptics", exact: true }).click();
  await expect(preview).toHaveCount(0);
  await expect(inspector).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Animation tools", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "DexTourLoader", exact: true }).click();
  await expect(mapping.locator("option:checked")).toHaveText("JustHaptics");
  const inspectorWidth = await page.locator(".workspace-inspector").evaluate((element) => ({
    width: element.getBoundingClientRect().width,
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  expect(inspectorWidth.width).toBe(300);
  expect(inspectorWidth.scrollWidth).toBeLessThanOrEqual(inspectorWidth.clientWidth);
  await expect(page.locator(".animation-preview")).toHaveCount(1);
  await page.reload();
  await page.getByRole("tab", { name: "animation", exact: true }).click();
  await expect(mapping.locator("option:checked")).toHaveText("JustHaptics");
  await expect(page.locator(".animation-preview")).toHaveCount(1);
  expect(errors).toEqual([]);
});

test("the actual Rive drawing survives preview hide and layout changes", async ({
  page,
}, testInfo) => {
  const { preview, inspector, mounts, errors } = await openRive(page);
  const canvas = preview.locator("canvas");
  const rasters: { stage: string; width: number; height: number; paintedPixels: number }[] = [];
  const painted = async (stage: string) => {
    const background = await canvas.evaluate((element) => {
      if (!element.parentElement) throw new Error("Missing Rive preview stage");
      return getComputedStyle(element.parentElement).backgroundColor;
    });
    const image = await canvas.screenshot({ path: testInfo.outputPath(`${stage}.png`) });
    const raster = await page.evaluate(
      async ({ image, background }) => {
        const bitmap = await createImageBitmap(await (await fetch(image)).blob());
        const surface = document.createElement("canvas");
        const context = surface.getContext("2d");
        if (!context) throw new Error("Missing screenshot decoder");
        context.fillStyle = background;
        context.fillRect(0, 0, 1, 1);
        const backdrop = context.getImageData(0, 0, 1, 1).data;
        surface.width = bitmap.width;
        surface.height = bitmap.height;
        context.drawImage(bitmap, 0, 0);
        bitmap.close();
        const pixels = context.getImageData(0, 0, surface.width, surface.height).data;
        let paintedPixels = 0;
        for (let index = 0; index < pixels.length; index += 4)
          if (
            pixels[index + 3] !== 0 &&
            (pixels[index] !== backdrop[0] ||
              pixels[index + 1] !== backdrop[1] ||
              pixels[index + 2] !== backdrop[2])
          )
            paintedPixels++;
        return { width: surface.width, height: surface.height, paintedPixels };
      },
      { image: `data:image/png;base64,${image.toString("base64")}`, background },
    );
    rasters.push({ stage, ...raster });
    return raster.paintedPixels > 0;
  };
  await inspector.getByRole("button", { name: "Play with haptics", exact: true }).click();
  await expect
    .poll(() =>
      canvas.evaluate((element) => {
        if (!(element instanceof HTMLCanvasElement)) throw new Error("Missing real Rive canvas");
        const blank = document.createElement("canvas");
        blank.width = element.width;
        blank.height = element.height;
        if (element.toDataURL() === blank.toDataURL()) return false;
        const pause = document.querySelector(".rive-panel button[aria-label='Pause animation']");
        if (!(pause instanceof HTMLButtonElement)) return false;
        pause.click();
        return true;
      }),
    )
    .toBe(true);
  await expect(preview.getByRole("button", { name: "Play animation", exact: true })).toBeVisible();
  try {
    await expect.poll(() => painted("paused-before-layout")).toBe(true);
    await preview.getByRole("button", { name: "Stacked", exact: true }).click();
    await expect.poll(() => painted("stacked")).toBe(true);
    await preview.getByRole("button", { name: "Side by side", exact: true }).click();
    await expect.poll(() => painted("side-by-side")).toBe(true);
    await preview.getByRole("button", { name: "Hide animation preview", exact: true }).click();
    await inspector.getByRole("button", { name: "Show preview", exact: true }).click();
    await expect.poll(() => painted("shown")).toBe(true);
    expect(mounts()).toBe(2);
    expect(errors).toEqual([]);
  } finally {
    await testInfo.attach("paused-rive-raster", {
      body: JSON.stringify({ rasters, mounts: mounts(), errors }),
      contentType: "application/json",
    });
  }
  await page.screenshot({ path: testInfo.outputPath("actual-rive-drawing.png") });
});
