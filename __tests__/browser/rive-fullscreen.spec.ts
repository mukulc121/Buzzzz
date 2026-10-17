import { expect, test, type Page } from "@playwright/test";
import { parseMessage, type Msg } from "@buzzzz/core";

async function openRive(page: Page) {
  const signals: string[] = [];
  const impacts: string[] = [];
  const messages: Msg[] = [];
  await page.exposeFunction("__fullscreenRiveSignal", (name: string) => signals.push(name));
  await page.exposeFunction("__fullscreenRiveImpact", (impact: string) => impacts.push(impact));
  await page.route(/\/src\/features\/rive\/createRive\.ts(?:\?.*)?$/, async (route) => {
    const response = await route.fetch();
    const source = await response.text();
    if (!source.includes("props.onFired(name);")) throw new Error("Actual VM callback missing");
    await route.fulfill({
      response,
      body: source.replace(
        "props.onFired(name);",
        "globalThis.__fullscreenRiveSignal(name); props.onFired(name);",
      ),
    });
  });
  await page.route(/\/src\/features\/rive\/useRiveSound\.ts(?:\?.*)?$/, async (route) => {
    const response = await route.fetch();
    const source = await response.text();
    const marker = "const token = ++generation.current;";
    if (!source.includes(marker)) throw new Error("Actual Rive sound dispatch missing");
    await route.fulfill({
      response,
      body: source.replace(
        marker,
        'globalThis.__fullscreenRiveImpact(typeof cue === "string" ? cue : "pulsar" in cue ? cue.pulsar : cue.preset); ' +
          marker,
      ),
    });
  });
  await page.routeWebSocket("**/relay?role=studio", (socket) => {
    socket.send(JSON.stringify({ type: "peers", phones: 1 }));
    socket.onMessage((data) => {
      const message = typeof data === "string" ? parseMessage(data) : null;
      if (message) messages.push(message);
    });
  });
  await page.route("**/riv", (route) =>
    route.fulfill({ json: { path: `/riv/${"a".repeat(32)}.riv` } }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await page.getByRole("button", { name: "Create sample project", exact: true }).click();
  await page.getByRole("button", { name: "DexTourLoader", exact: true }).click();
  const panel = page.locator(".rive-panel");
  await expect(panel.getByRole("button", { name: "Fire isLoaded", exact: true })).toBeVisible();
  await expect.poll(() => signals.includes("hapticEntry")).toBe(true);
  return { panel, signals, impacts, messages };
}

async function expectFullCanvas(page: Page) {
  await expect
    .poll(() => page.evaluate(() => document.fullscreenElement?.classList.contains("rive-panel")))
    .toBe(true);
  const dimensions = await page.locator(".rive-panel canvas").evaluate((canvas) => {
    const bounds = canvas.getBoundingClientRect();
    return {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      viewportWidth: innerWidth,
      viewportHeight: innerHeight,
      unobstructed: document.elementFromPoint(10, 10) === canvas,
    };
  });
  expect(dimensions).toMatchObject({
    x: 0,
    y: 0,
    width: dimensions.viewportWidth,
    height: dimensions.viewportHeight,
    unobstructed: true,
  });
  const controls = page.getByRole("group", { name: "Fullscreen Rive playback", exact: true });
  const bounds = await controls.boundingBox();
  if (!bounds) throw new Error("Fullscreen controls missing");
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(dimensions.viewportWidth);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(dimensions.viewportHeight);
  return controls;
}

test("fullscreen replays the real finite Rive scene repeatedly and pauses the same instance", async ({
  page,
}, testInfo) => {
  test.setTimeout(40_000);
  const runtime = await openRive(page);
  const canvas = await runtime.panel.locator("canvas").elementHandle();
  if (!canvas) throw new Error("Rive canvas missing");
  await runtime.panel.getByRole("button", { name: "Fullscreen Rive preview", exact: true }).click();
  const controls = await expectFullCanvas(page);
  await expect(
    runtime.panel.getByRole("button", { name: "Fire isLoaded", exact: true }),
  ).toBeHidden();
  expect(
    await canvas.evaluate((node) => node === document.querySelector(".rive-panel canvas")),
  ).toBe(true);
  let entryCount = runtime.signals.filter((name) => name === "hapticEntry").length;
  let readyCount = runtime.signals.filter((name) => name === "isLoaded").length;
  const before = runtime.impacts.length;
  await controls.getByRole("button", { name: "Replay Rive animation", exact: true }).click();
  await expect
    .poll(() => runtime.signals.filter((name) => name === "hapticEntry").length)
    .toBe(++entryCount);
  await controls
    .getByRole("button", { name: "Pause Rive animation", exact: true })
    .dispatchEvent("click");
  await expect(
    controls.getByRole("button", { name: "Play Rive animation", exact: true }),
  ).toBeVisible();
  await expect
    .poll(() => runtime.messages.filter((message) => message.type === "pause").at(-1))
    .toEqual({ type: "pause", paused: true });
  const pausedImpacts = runtime.impacts.length;
  await page.waitForTimeout(400);
  expect(runtime.impacts).toHaveLength(pausedImpacts);
  const screenshot = testInfo.outputPath("fullscreen-paused.png");
  await page.screenshot({ path: screenshot });
  await testInfo.attach("fullscreen-paused", {
    path: screenshot,
    contentType: "image/png",
  });
  await controls
    .getByRole("button", { name: "Play Rive animation", exact: true })
    .dispatchEvent("click");
  await expect
    .poll(() => runtime.messages.filter((message) => message.type === "pause").at(-1))
    .toEqual({ type: "pause", paused: false });
  await expect
    .poll(() => runtime.signals.filter((name) => name === "isLoaded").length)
    .toBe(++readyCount);
  await expect(
    controls.getByRole("button", { name: "Play Rive animation", exact: true }),
  ).toBeVisible({ timeout: 10000 });
  expect(runtime.signals.filter((name) => name === "hapticEntry")).toHaveLength(entryCount);
  expect(runtime.impacts.length).toBeGreaterThan(before);
  const completedImpacts = runtime.impacts.length;
  await controls.getByRole("button", { name: "Replay Rive animation", exact: true }).click();
  await expect
    .poll(() => runtime.signals.filter((name) => name === "hapticEntry").length)
    .toBe(++entryCount);
  await expect
    .poll(() => runtime.signals.filter((name) => name === "isLoaded").length)
    .toBe(++readyCount);
  await expect(
    controls.getByRole("button", { name: "Play Rive animation", exact: true }),
  ).toBeVisible({ timeout: 10000 });
  expect(runtime.impacts.length).toBeGreaterThan(completedImpacts);
  const replayedImpacts = runtime.impacts.length;
  await controls.getByRole("button", { name: "Play Rive animation", exact: true }).click();
  await expect
    .poll(() => runtime.signals.filter((name) => name === "hapticEntry").length)
    .toBe(++entryCount);
  await expect
    .poll(() => runtime.signals.filter((name) => name === "isLoaded").length)
    .toBe(++readyCount);
  await expect(
    controls.getByRole("button", { name: "Play Rive animation", exact: true }),
  ).toBeVisible({ timeout: 10000 });
  expect(runtime.impacts.length).toBeGreaterThan(replayedImpacts);
  expect(runtime.messages.filter((message) => message.type === "restart")).toHaveLength(3);
  await controls.getByRole("button", { name: "Exit fullscreen Rive preview", exact: true }).click();
  await expect.poll(() => page.evaluate(() => document.fullscreenElement === null)).toBe(true);
  await expect(
    runtime.panel.getByRole("button", { name: "Fire isLoaded", exact: true }),
  ).toBeVisible();
  expect(
    await canvas.evaluate((node) => node === document.querySelector(".rive-panel canvas")),
  ).toBe(true);
});

test("fullscreen canvas reaches every edge on a narrow viewport and Escape restores the panel", async ({
  page,
}) => {
  const runtime = await openRive(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await runtime.panel.getByRole("button", { name: "Fullscreen Rive preview", exact: true }).click();
  await expectFullCanvas(page);
  await page.keyboard.press("Escape");
  await expect.poll(() => page.evaluate(() => document.fullscreenElement === null)).toBe(true);
  await expect(
    runtime.panel.getByRole("button", { name: "Fullscreen Rive preview", exact: true }),
  ).toBeVisible();
  await expect(
    runtime.panel.getByRole("button", { name: "Fire isLoaded", exact: true }),
  ).toBeVisible();
});
