import { expect, test, type Page, type Route } from "@playwright/test";
import { parseMessage, type Msg } from "@buzzzz/core";
import { editorPlay, editorStop } from "./fixtures/editor-playback";

interface ISignal {
  name: string;
  time: number;
}

async function setVisibility(page: Page, visibility: "hidden" | "visible", pagehide = false) {
  return page.evaluate(
    ({ visibility, pagehide }) => {
      Object.defineProperty(document, "visibilityState", { configurable: true, value: visibility });
      document.dispatchEvent(new Event("visibilitychange"));
      document.dispatchEvent(new Event("visibilitychange"));
      if (pagehide) window.dispatchEvent(new PageTransitionEvent("pagehide"));
      return performance.now();
    },
    { visibility, pagehide },
  );
}

async function observeRuntime(page: Page) {
  const signals: ISignal[] = [];
  const acceptedSignals: string[] = [];
  const impacts: string[] = [];
  const messages: Msg[] = [];
  let uploads = 0;
  await page.exposeFunction("__lifecycleSignal", (name: string, time: number) =>
    signals.push({ name, time }),
  );
  await page.exposeFunction("__lifecycleImpact", (impact: string) => impacts.push(impact));
  await page.exposeFunction("__lifecycleAccepted", (name: string) => acceptedSignals.push(name));
  await page.route(/\/src\/features\/rive\/useRiveSession\.ts(?:\?.*)?$/, async (route) => {
    const response = await route.fetch();
    const source = await response.text();
    const handler = "addLog(`Studio fired ${name}`);";
    if (!source.includes(handler)) throw new Error("Actual accepted trigger callback missing");
    await route.fulfill({
      response,
      body: source.replace(
        handler,
        "globalThis.__lifecycleAcceptedCount = (globalThis.__lifecycleAcceptedCount ?? 0) + 1; globalThis.__lifecycleAccepted(name); " +
          handler,
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
  await page.route(/\/src\/features\/rive\/createRive\.ts(?:\?.*)?$/, async (route) => {
    const response = await route.fetch();
    const source = await response.text();
    if (!source.includes("props.onFired(name);")) throw new Error("Actual VM callback missing");
    await route.fulfill({
      response,
      body: source
        .replace(
          "const { Rive, RuntimeLoader } =",
          "globalThis.__lateLifecycleSignal = props.onFired; const { Rive, RuntimeLoader } =",
        )
        .replace(
          "props.onFired(name);",
          "globalThis.__lifecycleSignal(name,performance.now()); props.onFired(name);",
        ),
    });
  });
  await page.route(/\/src\/features\/rive\/systemImpactPattern\.ts(?:\?.*)?$/, async (route) => {
    const response = await route.fetch();
    const source = await response.text();
    if (!source.includes("return pulsarPresets.find(")) throw new Error("System lookup missing");
    await route.fulfill({
      response,
      body: source.replace(
        "return pulsarPresets.find(",
        "globalThis.__lifecycleImpact(impact); return pulsarPresets.find(",
      ),
    });
  });
  await page.route("**/riv", async (route) => {
    uploads++;
    await route.fulfill({ json: { path: `/riv/${"a".repeat(32)}.riv` } });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await page.getByRole("button", { name: "Create sample project", exact: true }).click();
  return { signals, acceptedSignals, impacts, messages, uploads: () => uploads };
}

test("hiding a ready Rive owner pauses once and resumes its remaining real VM lifecycle", async ({
  page,
}) => {
  const runtime = await observeRuntime(page);
  await setVisibility(page, "hidden", true);
  expect(runtime.messages.filter((message) => message.type === "pause")).toEqual([]);
  await setVisibility(page, "visible");
  await page.getByRole("button", { name: "DexTourLoader", exact: true }).click();
  const panel = page.locator(".rive-panel");
  await expect
    .poll(() => runtime.signals.some((signal) => signal.name === "hapticEntry"))
    .toBe(true);
  await expect(editorStop(page)).toBeVisible();
  const hiddenAt = await setVisibility(page, "hidden", true);
  await expect(panel.getByRole("button", { name: "Resume", exact: true })).toBeVisible();
  await expect(editorPlay(page)).toBeVisible();
  await expect
    .poll(() => runtime.messages.filter((message) => message.type === "pause"))
    .toEqual([{ type: "pause", paused: true }]);
  const pausedImpacts = runtime.impacts.length;
  await page.evaluate(() => {
    const runtime: unknown = globalThis;
    if (
      typeof runtime !== "object" ||
      runtime === null ||
      !("__lateLifecycleSignal" in runtime) ||
      typeof runtime.__lateLifecycleSignal !== "function"
    )
      throw new Error("Late VM callback missing");
    runtime.__lateLifecycleSignal("hapticExit");
  });
  await page.waitForTimeout(3000);
  expect(runtime.impacts).toHaveLength(pausedImpacts);
  expect(runtime.signals.some((signal) => signal.name === "isLoaded")).toBe(false);
  await setVisibility(page, "visible");
  await expect(panel.getByRole("button", { name: "Resume", exact: true })).toBeVisible();
  await page.waitForTimeout(300);
  expect(runtime.impacts).toHaveLength(pausedImpacts);
  const resumedAt = await page.evaluate(() => performance.now());
  await panel.getByRole("button", { name: "Resume", exact: true }).dispatchEvent("click");
  await expect.poll(() => runtime.signals.some((signal) => signal.name === "isLoaded")).toBe(true);
  await expect(panel.getByRole("button", { name: "Resume", exact: true })).toBeVisible({
    timeout: 10000,
  });
  const entry = runtime.signals.find((signal) => signal.name === "hapticEntry");
  const ready = runtime.signals.find((signal) => signal.name === "isLoaded");
  if (!entry || !ready) throw new Error("Actual lifecycle signals missing");
  expect(ready.time - entry.time).toBeGreaterThanOrEqual(2400 + resumedAt - hiddenAt);
  expect(runtime.signals.filter((signal) => signal.name === "hapticEntry")).toHaveLength(1);
  expect(runtime.messages.filter((message) => message.type === "pause")).toEqual([
    { type: "pause", paused: true },
    { type: "pause", paused: false },
  ]);
});

test("a Rive scene that becomes ready while hidden waits for an explicit visible Resume", async ({
  page,
}) => {
  const wasm: Route[] = [];
  await page.route(/\/rive\.wasm(?:\?.*)?$/, async (route) => {
    if (route.request().resourceType() === "script") await route.continue();
    else wasm.push(route);
  });
  const runtime = await observeRuntime(page);
  await page.getByRole("button", { name: "DexTourLoader", exact: true }).click();
  await expect.poll(() => wasm.length).toBe(1);
  await setVisibility(page, "hidden", true);
  expect(runtime.messages.filter((message) => message.type === "pause")).toEqual([]);
  const loading = wasm[0];
  if (!loading) throw new Error("Actual Rive WASM request missing");
  await loading.continue();
  const panel = page.locator(".rive-panel");
  await expect(panel.getByRole("button", { name: "Fire isLoaded", exact: true })).toBeVisible();
  await expect(panel.getByRole("button", { name: "Resume", exact: true })).toBeVisible();
  await expect(editorPlay(page)).toBeVisible();
  await page.waitForTimeout(600);
  expect(runtime.acceptedSignals).toEqual([]);
  expect(runtime.impacts).toEqual([]);
  expect(runtime.uploads()).toBe(0);
  expect(runtime.messages.filter((message) => message.type === "load")).toEqual([]);
  await setVisibility(page, "visible");
  await page.waitForTimeout(300);
  expect(runtime.acceptedSignals).toEqual([]);
  expect(runtime.uploads()).toBe(0);
  await panel.getByRole("button", { name: "Resume", exact: true }).dispatchEvent("click");
  await expect
    .poll(() => runtime.signals.some((signal) => signal.name === "hapticEntry"))
    .toBe(true);
  await expect
    .poll(() => runtime.messages.filter((message) => message.type === "load").length)
    .toBe(1);
  await expect(panel.getByRole("button", { name: "Resume", exact: true })).toBeVisible({
    timeout: 10000,
  });
  expect(runtime.acceptedSignals).toEqual(["hapticEntry", "hapticLoop", "isLoaded"]);
  expect(runtime.messages.filter((message) => message.type === "pause")).toEqual([
    { type: "pause", paused: false },
  ]);
});

test("direct header Restart from completion accepts a fresh real VM entry and completes again", async ({
  page,
}) => {
  const runtime = await observeRuntime(page);
  await page.getByRole("button", { name: "DexTourLoader", exact: true }).click();
  const panel = page.locator(".rive-panel");
  await expect
    .poll(() => runtime.acceptedSignals.filter((name) => name === "isLoaded").length)
    .toBe(1);
  await expect(panel.getByRole("button", { name: "Resume", exact: true })).toBeVisible({
    timeout: 10000,
  });
  expect(runtime.acceptedSignals.filter((name) => name === "hapticEntry")).toHaveLength(1);
  const initialImpacts = runtime.impacts.length;
  await editorPlay(page).dispatchEvent("click");
  await expect
    .poll(() => runtime.signals.filter((signal) => signal.name === "hapticEntry").length)
    .toBe(2);
  await expect
    .poll(() => runtime.acceptedSignals.filter((name) => name === "hapticEntry").length)
    .toBe(2);
  await expect
    .poll(() => runtime.acceptedSignals.filter((name) => name === "isLoaded").length)
    .toBe(2);
  await expect(panel.getByRole("button", { name: "Resume", exact: true })).toBeVisible({
    timeout: 10000,
  });
  expect(runtime.acceptedSignals.filter((name) => name === "isLoaded")).toHaveLength(2);
  expect(runtime.impacts.length).toBeGreaterThan(initialImpacts);
});

test("pagehide alone pauses once before same-turn legacy VM callbacks can escape", async ({
  page,
}) => {
  const runtime = await observeRuntime(page);
  await page.getByRole("button", { name: "DexTourLoader", exact: true }).click();
  const panel = page.locator(".rive-panel");
  await expect(editorStop(page)).toBeVisible();
  await panel.getByRole("combobox", { name: "Pattern for isLoaded", exact: true }).selectOption({
    label: "ExplosionAnimation",
  });
  const accepted = await page.evaluate(() => {
    const runtime: unknown = globalThis;
    if (
      typeof runtime !== "object" ||
      runtime === null ||
      !("__lateLifecycleSignal" in runtime) ||
      typeof runtime.__lateLifecycleSignal !== "function" ||
      !("__lifecycleAcceptedCount" in runtime) ||
      typeof runtime.__lifecycleAcceptedCount !== "number"
    )
      throw new Error("Late VM callback missing");
    const before = runtime.__lifecycleAcceptedCount;
    window.dispatchEvent(new PageTransitionEvent("pagehide"));
    runtime.__lateLifecycleSignal("isLoaded");
    window.dispatchEvent(new PageTransitionEvent("pagehide"));
    return runtime.__lifecycleAcceptedCount - before;
  });
  await expect(panel.getByRole("button", { name: "Resume", exact: true })).toBeVisible();
  expect(accepted).toBe(0);
  expect(runtime.messages.filter((message) => message.type === "pause")).toEqual([
    { type: "pause", paused: true },
  ]);
});
