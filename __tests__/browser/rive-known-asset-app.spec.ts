import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { parseMessage, type Msg } from "@buzzzz/core";
import { unzipSync } from "fflate";
import { DEX_RIVE_CONFIG } from "../../apps/studio/src/features/project/starter/rive/dex-rive-config";

const DEX = "apps/studio/src/features/project/starter/rive/dexHeadoutIntegration.riv";
const TRIGGERS = ["hapticEntry", "hapticLoop", "hapticLoopStop", "hapticExit"];

async function open(page: Page) {
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
  return messages;
}

async function drop(page: Page, bytes: Uint8Array, name: string) {
  const transfer = await page.evaluateHandle(
    ([bytes, name]) => {
      const data = new DataTransfer();
      data.items.add(new File([new Uint8Array(bytes)], name));
      return data;
    },
    [[...bytes], name] as const,
  );
  await page.locator(".shell").dispatchEvent("drop", { dataTransfer: transfer });
  await transfer.dispose();
}

const stored = (page: Page) =>
  page.evaluate(() => {
    const id = localStorage.getItem("buzzzz.lastProject");
    return JSON.parse(localStorage.getItem(`buzzzz.project.${id}`) ?? "null").project;
  });
const loads = (messages: Msg[]) => messages.filter((message) => message.type === "load");

test("the exact Dex file attached as a generic upload restores source haptics everywhere", async ({
  page,
}) => {
  const messages = await open(page);
  await drop(page, new Uint8Array(await readFile(DEX)), "generic-upload.riv");
  const panel = page.locator(".rive-panel");
  await expect(panel.getByText("generic-upload.riv", { exact: true })).toBeVisible();
  await expect.poll(async () => (await stored(page)).riveConfig).toEqual(DEX_RIVE_CONFIG);
  expect((await stored(page)).rivePresetId).toBe("demo-fanfare-sound");
  expect((await stored(page)).map).toEqual({});
  await expect.poll(() => loads(messages).length).toBeGreaterThan(0);
  for (const load of loads(messages)) {
    if (load.type !== "load") continue;
    expect(Object.keys(load.riveConfig?.haptics ?? {})).toEqual(TRIGGERS);
    expect(load.riveConfig?.nativeSound).toBe(false);
  }
  await page.reload();
  await page.getByRole("button", { name: "FanfareSound", exact: true }).click();
  await expect(panel.getByRole("button", { name: "Fire isLoaded", exact: true })).toBeVisible();
  expect((await stored(page)).riveConfig).toEqual(DEX_RIVE_CONFIG);
  const waiting = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export all 4 patterns", exact: true }).click();
  const path = await (await waiting).path();
  if (!path) throw new Error("Missing archive");
  const files = unzipSync(new Uint8Array(await readFile(path)));
  const manifest = JSON.parse(new TextDecoder().decode(files["manifest.json"]));
  expect(manifest.buzzzz.rivePresetId).toBe("demo-fanfare-sound");
  expect(manifest.buzzzz.riveConfig).toEqual(DEX_RIVE_CONFIG);
});

test("different bytes are never inferred and are not blocked", async ({ page }) => {
  await open(page);
  const dex = new Uint8Array(await readFile(DEX));
  const bytes = new Uint8Array(dex.length + 1);
  bytes.set(dex);
  await drop(page, bytes, "edited.riv");
  const panel = page.locator(".rive-panel");
  await expect(panel.getByText("edited.riv", { exact: true })).toBeVisible();
  await expect(panel.locator(".stage")).not.toHaveClass(/empty/);
  await page.waitForTimeout(300);
  expect((await stored(page)).riveConfig).toBeUndefined();
  expect((await stored(page)).rivePresetId).toBe("demo-fanfare-sound");
});

test("a custom map on the exact Dex file is preserved instead of replaced", async ({ page }) => {
  const messages = await open(page);
  await drop(page, new Uint8Array(await readFile(DEX)), "mapped.riv");
  await expect.poll(async () => (await stored(page)).riveConfig).toEqual(DEX_RIVE_CONFIG);
  const edited = await page.evaluate(() => {
    const id = localStorage.getItem("buzzzz.lastProject");
    const record = JSON.parse(localStorage.getItem(`buzzzz.project.${id}`) ?? "null");
    delete record.project.riveConfig;
    record.project.map = { hapticEntry: "demo-fanfare-sound" };
    return { key: `buzzzz.project.${id}`, value: JSON.stringify(record) };
  });
  await page.addInitScript((edited) => {
    if (!sessionStorage.getItem("known-rive-edited")) {
      sessionStorage.setItem("known-rive-edited", "1");
      localStorage.setItem(edited.key, edited.value);
    }
  }, edited);
  messages.length = 0;
  await page.reload();
  await page.getByRole("button", { name: "FanfareSound", exact: true }).click();
  await expect(
    page.locator(".rive-panel").getByRole("button", { name: "Fire hapticEntry", exact: true }),
  ).toBeVisible();
  await expect.poll(() => loads(messages).length).toBeGreaterThan(0);
  const load = loads(messages).at(-1);
  expect(load?.type === "load" && load.riveConfig).toBeFalsy();
  await expect(
    page.locator(".rive-panel").getByRole("combobox", { name: "Pattern for hapticEntry" }),
  ).toHaveValue("demo-fanfare-sound");
  await page.waitForTimeout(300);
  const project = await stored(page);
  expect(project.riveConfig).toBeUndefined();
  expect(project.map).toEqual({ hapticEntry: "demo-fanfare-sound" });
});
