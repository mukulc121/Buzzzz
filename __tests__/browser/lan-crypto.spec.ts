import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { parseMessage, type Msg } from "@buzzzz/core";
import { unzipSync } from "fflate";
import { editorPlay } from "./fixtures/editor-playback";
import { patternTitle, renamePattern } from "./fixtures/pattern-title";
import { DEX_RIVE_CONFIG } from "../../apps/studio/src/features/project/starter/rive/dex-rive-config";

const lanOrigin = process.env.BUZZZZ_LAN_URL;

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("buzzzz.onboarding.seen", "true");
    if (window.isSecureContext) {
      Object.defineProperty(crypto, "randomUUID", { value: undefined, configurable: true });
      Object.defineProperty(crypto, "subtle", { value: undefined, configurable: true });
    }
  });
});

test("HTTP visitors can create, edit, attach, export and send media to a phone without secure-only crypto", async ({
  page,
}, testInfo) => {
  test.setTimeout(90_000);
  const origin = lanOrigin ?? testInfo.project.use.baseURL;
  if (!origin) throw new Error("Missing Studio origin");
  const errors: string[] = [];
  const messages: Msg[] = [];
  const uploads: Buffer[] = [];
  const roomId = "a".repeat(32);
  const assetId = `${"c".repeat(32)}.bin`;
  page.on("pageerror", (error) => errors.push(error.message));
  await page.routeWebSocket("**/relay?role=studio", (socket) => {
    socket.onMessage((data) => {
      const message = typeof data === "string" ? parseMessage(data) : null;
      if (message) messages.push(message);
    });
    socket.send(JSON.stringify({ type: "peers", phones: 1 }));
  });
  await page.route("**/media/session", (route) =>
    route.fulfill({ json: { origin, roomId, hostToken: "b".repeat(43) } }),
  );
  await page.route("**/v1/rooms/*/assets?kind=media", (route) => {
    const bytes = route.request().postDataBuffer();
    if (!bytes) throw new Error("Missing phone media upload bytes");
    uploads.push(bytes);
    return route.fulfill({
      json: {
        assetId,
        bytes: bytes.byteLength,
        path: `${origin}/v1/rooms/${roomId}/assets/${assetId}?token=${"d".repeat(43)}`,
      },
    });
  });
  await page.route("**/riv", (route) =>
    route.fulfill({ json: { path: `/riv/${"e".repeat(32)}.riv` } }),
  );
  await page.goto(`${origin}/studio/projects`);
  expect(await page.evaluate(() => typeof crypto.randomUUID)).toBe("undefined");
  expect(await page.evaluate(() => typeof crypto.subtle)).toBe("undefined");
  if (lanOrigin) expect(await page.evaluate(() => window.isSecureContext)).toBe(false);
  await page
    .locator(".project-dashboard-header")
    .getByRole("button", { name: "Create sample project", exact: true })
    .click();
  await expect(patternTitle(page)).toHaveText("ExplosionAnimation");
  await expect(page.locator(".save-status")).toHaveAttribute("data-status", /editing|unlocked/);
  await page.getByRole("button", { name: "JustHaptics", exact: true }).click();
  await renamePattern(page, "LAN haptics");
  await page.getByRole("tab", { name: "inspector", exact: true }).click();
  await page.getByRole("button", { name: "Add marker at the cursor", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Marker label", exact: true })).toHaveValue(
    "Marker 1",
  );
  await editorPlay(page).click();
  await expect
    .poll(() => messages.find((message) => message.type === "haptic-preset"))
    .toMatchObject({ type: "haptic-preset", name: "LAN haptics" });
  const played = messages.find((message) => message.type === "haptic-preset");
  if (!played || played.type !== "haptic-preset") throw new Error("Missing phone pattern");
  expect(played.version).toBe(
    createHash("sha256").update(JSON.stringify(played.pattern)).digest("hex"),
  );
  await page.getByRole("button", { name: "FanfareSound", exact: true }).click();
  await page.getByRole("tab", { name: "sound", exact: true }).click();
  await expect(page.getByRole("tabpanel", { name: "sound", exact: true })).toContainText(
    "fanfaresound.mp3",
  );
  await editorPlay(page).click();
  await expect
    .poll(() => messages.find((message) => message.type === "audio-haptics"))
    .toMatchObject({ type: "audio-haptics", name: "FanfareSound" });
  const audio = messages.find((message) => message.type === "audio-haptics");
  if (!audio || audio.type !== "audio-haptics") throw new Error("Missing phone audio");
  expect(audio.audio.clipId).toBe(createHash("sha256").update(uploads[0]!).digest("hex"));
  await page.getByRole("button", { name: "Media", exact: true }).click();
  await page.getByRole("button", { name: "Upload media", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Upload media", exact: true });
  const picker = page.waitForEvent("filechooser");
  await dialog.getByRole("button", { name: "Choose files", exact: true }).click();
  await (await picker).setFiles("apps/preview/src/features/demos/lottie/bounce.json");
  const row = page.locator(".media-item").filter({ hasText: "bounce.json" });
  await expect(row).toBeVisible();
  await row.click({ button: "right" });
  await page.getByRole("menuitem", { name: "Add to canvas", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Animation canvas preview", exact: true }).locator("canvas"),
  ).toBeVisible({ timeout: 20_000 });
  await page.getByRole("tab", { name: "inspector", exact: true }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export all 4 patterns", exact: true }).click();
  const path = await (await download).path();
  if (!path) throw new Error("Missing exported project");
  const files = unzipSync(new Uint8Array(await readFile(path)));
  const manifest = JSON.parse(new TextDecoder().decode(files["manifest.json"]));
  expect(manifest.hash).toMatch(/^sha256-[a-f0-9]{64}$/);
  expect(manifest.presets).toHaveLength(4);
  await page.reload();
  await page.getByRole("button", { name: "FanfareSound", exact: true }).click();
  await expect(patternTitle(page)).toHaveText("FanfareSound");
  await expect(
    page.getByRole("region", { name: "Animation canvas preview", exact: true }).locator("canvas"),
  ).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: "LAN haptics", exact: true }).click();
  await page.getByRole("tab", { name: "inspector", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Marker label", exact: true })).toHaveValue(
    "Marker 1",
  );
  const dex = await readFile(
    "apps/studio/src/features/project/starter/rive/dexHeadoutIntegration.riv",
  );
  const transfer = await page.evaluateHandle(
    (bytes) => {
      const data = new DataTransfer();
      data.items.add(new File([new Uint8Array(bytes)], "lan-generic-loader.riv"));
      return data;
    },
    [...dex],
  );
  await page.locator(".shell").dispatchEvent("drop", { dataTransfer: transfer });
  await transfer.dispose();
  const rive = page.locator(".rive-panel");
  await expect(rive.getByText("lan-generic-loader.riv", { exact: true })).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => {
        const id = localStorage.getItem("buzzzz.lastProject");
        return JSON.parse(localStorage.getItem(`buzzzz.project.${id}`) ?? "null").project
          .riveConfig;
      }),
    )
    .toEqual(DEX_RIVE_CONFIG);
  await expect(rive.getByText("Rive-driven system cue", { exact: true })).toHaveCount(4);
  await expect
    .poll(() => messages.filter((message) => message.type === "load").at(-1)?.riveConfig)
    .toEqual(DEX_RIVE_CONFIG);
  expect(errors).toEqual([]);
  await testInfo.attach("lan-crypto-proof", {
    body: JSON.stringify({
      origin,
      realInsecureOrigin: Boolean(lanOrigin),
      uploads: uploads.length,
      errors,
    }),
    contentType: "application/json",
  });
});
