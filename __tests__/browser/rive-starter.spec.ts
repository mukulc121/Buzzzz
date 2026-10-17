import { createHash } from "node:crypto";
import { expect, test, type Route } from "@playwright/test";
import { parseMessage, type Msg } from "@buzzzz/core";
import { DEX_RIVE_CONFIG } from "../../apps/studio/src/features/project/starter/rive/dex-rive-config";

for (const fallback of [false, true])
  test(`Rive loads its ${fallback ? "fallback" : "primary"} WASM locally with public CDNs blocked`, async ({
    page,
  }) => {
    const external: string[] = [];
    const wasm: { path: string; status: number }[] = [];
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route(/https:\/\/(?:unpkg\.com|cdn\.jsdelivr\.net)\//, (route) => {
      external.push(new URL(route.request().url()).hostname);
      return route.abort();
    });
    await page.route(/\/rive(?:_fallback)?\.wasm(?:\?.*)?$/, async (route) => {
      if (route.request().resourceType() === "script") {
        await route.continue();
        return;
      }
      const url = new URL(route.request().url());
      expect(url.origin).toBe(new URL(page.url()).origin);
      if (fallback && url.pathname.endsWith("/rive.wasm")) {
        wasm.push({ path: "rive.wasm", status: 503 });
        await route.fulfill({ status: 503, body: "Primary unavailable" });
        return;
      }
      const response = await route.fetch();
      wasm.push({ path: url.pathname.split("/").at(-1) ?? "", status: response.status() });
      await route.fulfill({ response });
    });
    await page.addInitScript(() => localStorage.setItem("buzzzz.onboarding.seen", "true"));
    await page.routeWebSocket("**/relay?role=studio", (socket) =>
      socket.send(JSON.stringify({ type: "peers", phones: 0 })),
    );
    await page.goto("/");
    await page.getByRole("button", { name: "Projects", exact: true }).click();
    await page.getByRole("button", { name: "Create sample project", exact: true }).click();
    await page.getByRole("button", { name: "DexTourLoader", exact: true }).click();
    await expect(
      page.locator(".rive-panel").getByRole("button", { name: "Fire isLoaded", exact: true }),
    ).toBeVisible({ timeout: 15000 });
    const primary = wasm.filter((request) => request.path === "rive.wasm");
    expect(primary.length).toBeGreaterThan(0);
    expect(primary.every((request) => request.status === (fallback ? 503 : 200))).toBe(true);
    expect(wasm.filter((request) => request.path === "rive_fallback.wasm")).toEqual(
      fallback ? [{ path: "rive_fallback.wasm", status: 200 }] : [],
    );
    expect(external).toEqual([]);
    expect(errors).toEqual([]);
  });

test("the real Rive starter completes locally before a delayed phone load and cancels restarted cues", async ({
  page,
}, testInfo) => {
  test.setTimeout(60_000);
  const messages: Msg[] = [];
  const uploads: Route[] = [];
  const events: { name: string; time: number }[] = [];
  const impacts: { preset: string; time: number }[] = [];
  const mounts: number[] = [];
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.exposeFunction("__recordRiveTrigger", (name: string, time: number) =>
    events.push({ name, time }),
  );
  await page.exposeFunction("__recordRiveImpact", (preset: string, time: number) =>
    impacts.push({ preset, time }),
  );
  await page.exposeFunction("__recordRiveMount", (time: number) => mounts.push(time));
  await page.addInitScript(() => localStorage.setItem("buzzzz.onboarding.seen", "true"));
  await page.routeWebSocket("**/relay?role=studio", (socket) => {
    socket.onMessage((data) => {
      if (typeof data !== "string") return;
      const message = parseMessage(data);
      if (message) messages.push(message);
    });
    socket.send(JSON.stringify({ type: "peers", phones: 1 }));
  });
  await page.route(/\/src\/features\/rive\/createRive\.ts(?:\?.*)?$/, async (route) => {
    const response = await route.fetch();
    const source = await response.text();
    if (!source.includes("props.onFired(name);")) throw new Error("Missing actual VM callback");
    await route.fulfill({
      response,
      body: source.replace(
        "props.onFired(name);",
        "globalThis.__recordRiveTrigger(name,performance.now()); props.onFired(name);",
      ),
    });
  });
  await page.route(/\/src\/features\/rive\/useRive\.ts(?:\?.*)?$/, async (route) => {
    const response = await route.fetch();
    const source = await response.text();
    if (!source.includes("mountHaptics();")) throw new Error("Missing actual scene mount");
    await route.fulfill({
      response,
      body: source.replace(
        "mountHaptics();",
        "globalThis.__recordRiveMount(performance.now()); mountHaptics();",
      ),
    });
  });
  await page.route(/\/src\/features\/rive\/useRiveSound\.ts(?:\?.*)?$/, async (route) => {
    const response = await route.fetch();
    const source = await response.text();
    const marker = "const token = ++generation.current;";
    if (!source.includes(marker)) throw new Error("Missing actual Rive sound dispatch");
    await route.fulfill({
      response,
      body: source.replace(
        marker,
        'globalThis.__recordRiveImpact(typeof cue === "string" ? cue : "pulsar" in cue ? cue.pulsar : cue.preset, performance.now()); ' +
          marker,
      ),
    });
  });
  await page.route("**/riv", (route) => {
    uploads.push(route);
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await page.getByRole("button", { name: "Create sample project", exact: true }).click();
  await page.getByRole("button", { name: "DexTourLoader", exact: true }).click();
  const panel = page.locator(".rive-panel");
  await expect(panel.getByRole("button", { name: "Fire isLoaded", exact: true })).toBeVisible({
    timeout: 20_000,
  });
  for (const label of ["Entry · EngineRev", "Loop · Drone", "Exit · Lock", "Phase marker"])
    await expect(panel.getByText(label, { exact: true })).toBeVisible();
  await expect.poll(() => uploads.length).toBe(1);
  const bytes = uploads[0]?.request().postDataBuffer();
  if (!bytes) throw new Error("The Rive upload has no bytes");
  expect(bytes.byteLength).toBe(231444);
  expect(createHash("sha256").update(bytes).digest("hex")).toBe(
    "a1e7943e8b53816bdeff29cdf91441da5dd2c7fa5fe5f5c150100c12204a0da6",
  );
  await expect(panel.getByRole("button", { name: "Resume", exact: true })).toBeVisible({
    timeout: 15_000,
  });
  expect(events.map((event) => event.name)).toEqual(["hapticEntry", "hapticLoop", "isLoaded"]);
  const entry = events[0];
  const ready = events[2];
  if (!entry || !ready || !impacts.length)
    throw new Error("The actual Rive cues were not observed");
  const mountedAt = mounts.findLast((time) => time <= entry.time);
  if (mountedAt === undefined) throw new Error("The actual scene mount was not observed");
  expect(ready.time - mountedAt).toBeGreaterThanOrEqual(2400);
  expect(impacts.map((impact) => impact.preset)).toEqual(["EngineRev", "Drone", "Lock"]);
  const completedCount = impacts.length;
  await page.waitForTimeout(1800);
  expect(impacts).toHaveLength(completedCount);
  expect(messages.filter((message) => message.type === "pause")).toEqual([]);
  await uploads[0]?.fulfill({ json: { path: `/riv/${"a".repeat(32)}.riv` } });
  await expect.poll(() => messages.filter((message) => message.type === "load").length).toBe(1);
  expect(messages.find((message) => message.type === "load")).toMatchObject({
    type: "load",
    riveConfig: DEX_RIVE_CONFIG,
    stateMachine: "stateMachine",
    map: {},
  });
  expect(
    messages.some((message) => message.type === "play" || message.type === "haptic-preset"),
  ).toBe(false);
  await panel.screenshot({ path: testInfo.outputPath("completed-rive-starter.png") });
  await panel.getByRole("button", { name: "Fire hapticLoop", exact: true }).click();
  await panel.getByRole("button", { name: "Resume", exact: true }).dispatchEvent("click");
  await expect.poll(() => events.filter((event) => event.name === "hapticLoop").length).toBe(2);
  await page.waitForTimeout(800);
  expect(impacts).toHaveLength(completedCount);
  await panel.getByRole("button", { name: "Play with haptics", exact: true }).click();
  await expect.poll(() => events.filter((event) => event.name === "hapticEntry").length).toBe(2);
  await panel.getByRole("button", { name: "Pause", exact: true }).dispatchEvent("click");
  await expect(panel.getByRole("button", { name: "Resume", exact: true })).toBeVisible();
  const pausedCount = impacts.length;
  await page.waitForTimeout(2000);
  expect(impacts).toHaveLength(pausedCount);
  await panel.getByRole("button", { name: "Resume", exact: true }).dispatchEvent("click");
  await expect.poll(() => impacts.length).toBeGreaterThan(pausedCount);
  await expect(panel.getByRole("button", { name: "Resume", exact: true })).toBeVisible({
    timeout: 15000,
  });
  expect(events.filter((event) => event.name === "hapticEntry")).toHaveLength(2);
  expect(messages.filter((message) => message.type === "pause")).toEqual([
    { type: "pause", paused: false },
    { type: "pause", paused: true },
    { type: "pause", paused: false },
  ]);
  await panel.getByRole("button", { name: "Play with haptics", exact: true }).click();
  await expect.poll(() => events.filter((event) => event.name === "hapticEntry").length).toBe(3);
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  const leftCount = impacts.length;
  await page.waitForTimeout(800);
  expect(impacts).toHaveLength(leftCount);
  expect(errors).toEqual([]);
  await testInfo.attach("actual-rive-events", {
    body: JSON.stringify({ events, impacts }),
    contentType: "application/json",
  });
});
