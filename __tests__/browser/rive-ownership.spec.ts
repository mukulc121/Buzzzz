import { openRiveInspector } from "./fixtures/rive-controls";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { parseMessage, type Msg } from "@buzzzz/core";
import { unzipSync } from "fflate";
import { editorPlay, editorStop } from "./fixtures/editor-playback";
import { patternTitle } from "./fixtures/pattern-title";
import { DEX_RIVE_CONFIG } from "../../apps/studio/src/features/project/starter/rive/dex-rive-config";

test("only the Rive owner previews, uploads and plays source cues, including legacy starters", async ({
  page,
}) => {
  const messages: Msg[] = [];
  const impacts: string[] = [];
  const entries: string[] = [];
  let uploads = 0;
  await page.exposeFunction("__ownershipImpact", (impact: string) => impacts.push(impact));
  await page.exposeFunction("__ownershipTrigger", (name: string) => entries.push(name));
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
          "globalThis.__lateRiveTrigger = props.onFired; const { Rive, RuntimeLoader } =",
        )
        .replace(
          "props.onFired(name);",
          "globalThis.__ownershipTrigger(name); props.onFired(name);",
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
        'globalThis.__ownershipImpact(typeof cue === "string" ? cue : "pulsar" in cue ? cue.pulsar : cue.preset); ' +
          marker,
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
  await expect(page.getByRole("button", { name: "DexTourLoader", exact: true })).toContainText(
    "Rive · Pulsar presets",
  );
  const panel = page.locator(".rive-panel");
  for (const name of ["ExplosionAnimation", "FanfareSound", "JustHaptics"]) {
    await page.getByRole("button", { name, exact: true }).click();
    await expect(patternTitle(page)).toHaveText(name);
    await expect(panel).toHaveCount(0);
  }
  expect(uploads).toBe(0);
  expect(impacts).toEqual([]);
  await page.evaluate(() => {
    const id = localStorage.getItem("buzzzz.lastProject");
    const record: unknown = JSON.parse(localStorage.getItem(`buzzzz.project.${id}`) ?? "null");
    if (
      typeof record !== "object" ||
      record === null ||
      !("project" in record) ||
      typeof record.project !== "object" ||
      record.project === null
    )
      throw new Error("Saved sample missing");
    if ("rivePresetId" in record.project) delete record.project.rivePresetId;
    const config = "riveConfig" in record.project ? record.project.riveConfig : null;
    if (typeof config === "object" && config !== null && "nativeSound" in config)
      delete config.nativeSound;
    localStorage.setItem(`buzzzz.project.${id}`, JSON.stringify(record));
  });
  await page.reload();
  await expect(panel).toHaveCount(0);
  await page.getByRole("button", { name: "DexTourLoader", exact: true }).click();
  const controls = await openRiveInspector(page);
  await expect(controls.getByRole("button", { name: "Fire isLoaded", exact: true })).toBeVisible();
  await expect.poll(() => entries.filter((name) => name === "hapticEntry").length).toBe(1);
  await expect.poll(() => uploads).toBe(1);
  await expect
    .poll(() => messages.find((message) => message.type === "load"))
    .toMatchObject({
      riveConfig: { nativeSound: false },
    });
  await editorStop(page).dispatchEvent("click");
  await expect(editorPlay(page)).toHaveAccessibleName(
    "Play “DexTourLoader” - Rive animation and haptics · P",
  );
  await editorPlay(page).click();
  await expect.poll(() => entries.filter((name) => name === "hapticEntry").length).toBe(2);
  await page.getByRole("button", { name: "JustHaptics", exact: true }).click();
  await expect(panel).toHaveCount(0);
  const count = impacts.length;
  await page.evaluate(() => {
    const runtime: unknown = globalThis;
    if (
      typeof runtime !== "object" ||
      runtime === null ||
      !("__lateRiveTrigger" in runtime) ||
      typeof runtime.__lateRiveTrigger !== "function"
    )
      throw new Error("Late VM callback missing");
    runtime.__lateRiveTrigger("hapticExit");
  });
  await page.waitForTimeout(900);
  expect(impacts).toHaveLength(count);
  expect(messages.filter((message) => message.type === "load")).toHaveLength(1);
  expect(messages.filter((message) => message.type === "pause").at(-1)).toEqual({
    type: "pause",
    paused: true,
  });
  await page.reload();
  await expect(panel).toHaveCount(0);
});

test("exporting from another pattern preserves the Rive owner, script and exact source bytes", async ({
  page,
}) => {
  await page.routeWebSocket("**/relay?role=studio", (socket) =>
    socket.send(JSON.stringify({ type: "peers", phones: 0 })),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await page.getByRole("button", { name: "Create sample project", exact: true }).click();
  await expect(patternTitle(page)).toHaveText("ExplosionAnimation");
  await expect(page.locator(".rive-panel")).toHaveCount(0);
  const waiting = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export all 4 patterns", exact: true }).click();
  const download = await waiting;
  const path = await download.path();
  if (!path) throw new Error("Missing archive");
  const bytes = new Uint8Array(await readFile(path));
  const files = unzipSync(bytes);
  const manifest = JSON.parse(new TextDecoder().decode(files["manifest.json"]));
  expect(manifest.buzzzz.rivePresetId).toBe("dex-tour-loader");
  expect(Object.keys(manifest.buzzzz.riveConfig.haptics)).toEqual([
    "hapticEntry",
    "hapticLoop",
    "hapticExit",
  ]);
  expect(manifest.buzzzz.riveConfig.completion.phases.markers).toEqual(["hapticLoopStop"]);
  expect(createHash("sha256").update(files["rive/animation.riv"]).digest("hex")).toBe(
    "a1e7943e8b53816bdeff29cdf91441da5dd2c7fa5fe5f5c150100c12204a0da6",
  );
  const transfer = await page.evaluateHandle(
    (data) => {
      const transfer = new DataTransfer();
      transfer.items.add(
        new File([new Uint8Array(data)], "round-trip.pulsar", { type: "application/zip" }),
      );
      return transfer;
    },
    [...bytes],
  );
  await page.locator(".shell").dispatchEvent("drop", { dataTransfer: transfer });
  await transfer.dispose();
  await expect(patternTitle(page)).toHaveText("ExplosionAnimation");
  await expect(page.locator(".rive-panel")).toHaveCount(0);
  await page.getByRole("button", { name: "DexTourLoader", exact: true }).click();
  const controls = await openRiveInspector(page);
  await expect(controls.getByRole("button", { name: "Fire isLoaded", exact: true })).toBeVisible();
});

test("a validated Rive import moves ownership to the selected pattern and owner deletion detaches it", async ({
  page,
}) => {
  const messages: Msg[] = [];
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
  await page.getByRole("button", { name: "FanfareSound", exact: true }).click();
  const bytes = await readFile(
    "apps/studio/src/features/project/starter/rive/dexHeadoutIntegration.riv",
  );
  const transfer = await page.evaluateHandle(
    (bytes) => {
      const transfer = new DataTransfer();
      transfer.items.add(new File([new Uint8Array(bytes)], "selected.riv"));
      return transfer;
    },
    [...bytes],
  );
  await page.locator(".shell").dispatchEvent("drop", { dataTransfer: transfer });
  await transfer.dispose();
  const panel = page.locator(".rive-panel");
  await expect(panel.getByText("selected.riv", { exact: true })).toBeVisible();
  const stored = () =>
    page.evaluate(() => {
      const id = localStorage.getItem("buzzzz.lastProject");
      return JSON.parse(localStorage.getItem(`buzzzz.project.${id}`) ?? "null").project;
    });
  await expect.poll(async () => (await stored()).rivePresetId).toBe("demo-fanfare-sound");
  await expect.poll(async () => (await stored()).riveConfig).toEqual(DEX_RIVE_CONFIG);
  await expect.poll(() => messages.filter((message) => message.type === "load").length).toBe(1);
  expect(messages.find((message) => message.type === "load")).toMatchObject({
    riveConfig: DEX_RIVE_CONFIG,
  });
  await page.getByRole("button", { name: "DexTourLoader", exact: true }).click();
  await expect(panel).toHaveCount(0);
  await page.getByRole("button", { name: "FanfareSound", exact: true }).click();
  await expect(panel).toBeVisible();
  await page.getByRole("button", { name: "FanfareSound", exact: true }).click({ button: "right" });
  await page.getByRole("menuitem", { name: "Remove", exact: true }).click();
  await expect(panel).toHaveCount(0);
  await expect.poll(async () => (await stored()).rivePresetId).toBeNull();
  await page.reload();
  await expect(panel).toHaveCount(0);
  await page.getByRole("button", { name: "DexTourLoader", exact: true }).click();
  await expect(panel).toHaveCount(0);
});
