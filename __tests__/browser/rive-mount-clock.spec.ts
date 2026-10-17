import { openRiveInspector } from "./fixtures/rive-controls";
import { expect, test } from "@playwright/test";

for (const delayMs of [500, 3000])
  test(`Dex readiness uses scene mount despite a ${delayMs} ms runtime load`, async ({
    page,
  }, testInfo) => {
    const events: { name: string; time: number }[] = [];
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.exposeFunction("__riveMountClock", (name: string, time: number) =>
      events.push({ name, time }),
    );
    await page.addInitScript(() => localStorage.setItem("buzzzz.onboarding.seen", "true"));
    await page.routeWebSocket("**/relay?role=studio", (socket) =>
      socket.send(JSON.stringify({ type: "peers", phones: 0 })),
    );
    await page.route(/\/packages\/core\/src\/rive\/completion\.ts(?:\?.*)?$/, async (route) => {
      const response = await route.fetch();
      const source = await response.text();
      const start = "const later = (delayMs, callback) => {";
      if (!source.includes(start)) throw new Error("Missing actual completion timer");
      await route.fulfill({
        response,
        body: source.replace(
          start,
          `${start} globalThis.__riveMountClock('timer:'+delayMs,performance.now());`,
        ),
      });
    });
    await page.route(/\/src\/features\/rive\/useRive\.ts(?:\?.*)?$/, async (route) => {
      const response = await route.fetch();
      const source = await response.text();
      if (!source.includes("mountHaptics();")) throw new Error("Missing actual scene mount");
      await route.fulfill({
        response,
        body: source
          .replace(
            "mountHaptics();",
            'globalThis.__riveMountClock("mount",performance.now()); mountHaptics();',
          )
          .replace(
            "bindHaptics();",
            'globalThis.__riveMountClock("bind",performance.now()); bindHaptics();',
          ),
      });
    });
    await page.route(/\/src\/features\/rive\/useRiveSession\.ts(?:\?.*)?$/, async (route) => {
      const response = await route.fetch();
      const source = await response.text();
      await route.fulfill({
        response,
        body: source.replace(
          "fireTrigger: (name) => rive.fire(name)",
          'fireTrigger: (name) => {globalThis.__riveMountClock("request",performance.now()); rive.fire(name);}',
        ),
      });
    });
    await page.route(/\/src\/features\/rive\/createRive\.ts(?:\?.*)?$/, async (route) => {
      const response = await route.fetch();
      const source = await response.text();
      const start = "async function createRive(props) {";
      if (!source.includes(start) || !source.includes("props.onFired(name);"))
        throw new Error("Missing actual runtime or trigger callback");
      await route.fulfill({
        response,
        body: source
          .replace(start, `${start} await new Promise(resolve=>setTimeout(resolve,${delayMs}));`)
          .replace(
            "props.onFired(name);",
            "globalThis.__riveMountClock(name,performance.now()); props.onFired(name);",
          ),
      });
    });
    await page.goto("/");
    await page.getByRole("button", { name: "Projects", exact: true }).click();
    await page.getByRole("button", { name: "Create sample project", exact: true }).click();
    await page.getByRole("button", { name: "DexTourLoader", exact: true }).click();
    const panel = await openRiveInspector(page);
    await expect(panel.getByRole("button", { name: "Fire isLoaded", exact: true })).toBeVisible({
      timeout: 15000,
    });
    await expect.poll(() => events.some((event) => event.name === "isLoaded")).toBe(true);
    const mount = events.find((event) => event.name === "mount");
    const entry = events.find((event) => event.name === "hapticEntry");
    const ready = events.find((event) => event.name === "isLoaded");
    const bound = events.find((event) => event.name === "bind");
    const timer = events.find((event) => event.name.startsWith("timer:"));
    await testInfo.attach("mount-events", {
      body: JSON.stringify(events),
      contentType: "application/json",
    });
    if (!mount || !entry || !ready || !bound || !timer)
      throw new Error("Missing actual mount/binding/timer/readiness");
    expect(entry.time - mount.time).toBeGreaterThanOrEqual(delayMs);
    expect(ready.time - mount.time).toBeGreaterThanOrEqual(2400);
    const deadline = timer.time + Number(timer.name.slice("timer:".length));
    expect(Math.abs(deadline - Math.max(mount.time + 2500, bound.time))).toBeLessThan(50);
    expect(ready.time).toBeGreaterThanOrEqual(deadline - 20);
    await expect(panel.getByRole("button", { name: "Resume", exact: true })).toBeVisible({
      timeout: 15000,
    });
    expect(errors).toEqual([]);
  });
