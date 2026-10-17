import { patternTitle } from "./fixtures/pattern-title";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { expect, test, type Page, type WebSocketRoute } from "@playwright/test";
import { parseMessage, toDevice, type Msg } from "@buzzzz/core";
import { unzipSync } from "fflate";
import { isProjectRecord } from "../../apps/studio/src/features/project/model";

const sample = unzipSync(
  new Uint8Array(
    readFileSync(
      new URL(
        "../../apps/studio/src/features/project/starter/starting-demo-project.pulsar",
        import.meta.url,
      ),
    ),
  ),
);
const hash = (value: string | Uint8Array) => createHash("sha256").update(value).digest("hex");
const roomId = "a".repeat(32);
const origin = "http://192.168.0.111:5173";

async function storedPreset(page: Page) {
  const value: unknown = await page.evaluate(() => {
    const id = localStorage.getItem("buzzzz.lastProject");
    return JSON.parse(localStorage.getItem(`buzzzz.project.${id}`) ?? "null");
  });
  if (!isProjectRecord(value)) throw new Error("Missing saved sample project");
  const name = await patternTitle(page).innerText();
  const preset = value.project.presets.find((item) => item.name === name);
  if (!preset) throw new Error("Missing active sample pattern");
  return preset;
}

async function phone(page: Page, discoveryFailures = 0) {
  const messages: Msg[] = [];
  const sockets: WebSocketRoute[] = [];
  const uploads: { bytes: Buffer; contentType: string; url: string; assetId: string }[] = [];
  const discoveries: number[] = [];
  let holding = false;
  let release: (() => void) | undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/media/session", (route) => {
    discoveries.push(discoveries.length + 1);
    if (discoveries.length <= discoveryFailures)
      return route.fulfill({ status: 503, body: "Temporarily unavailable" });
    return route.fulfill({
      status: 201,
      json: {
        origin,
        roomId,
        hostToken: "b".repeat(43),
      },
    });
  });
  await page.route("**/v1/rooms/*/assets?kind=media", async (route) => {
    const request = route.request();
    const bytes = request.postDataBuffer();
    if (!bytes) throw new Error("The upload must contain the original media bytes");
    const assetId = `${uploads.length.toString(16).padStart(32, "c")}.bin`;
    uploads.push({
      bytes,
      contentType: request.headers()["content-type"] ?? "",
      url: request.url(),
      assetId,
    });
    if (holding) await gate;
    await route
      .fulfill({
        json: {
          assetId,
          path: `${origin}/v1/rooms/${roomId}/assets/${assetId}?token=${"d".repeat(43)}`,
          bytes: bytes.byteLength,
        },
      })
      .catch(() => {});
  });
  await page.routeWebSocket("**/relay?role=studio", (socket) => {
    sockets.push(socket);
    socket.onMessage((data) => {
      if (typeof data !== "string") return;
      const message = parseMessage(data);
      if (message) messages.push(message);
    });
    socket.send(JSON.stringify({ type: "peers", phones: 1 }));
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await page
    .locator(".project-dashboard-header")
    .getByRole("button", {
      name: "Create sample project",
      exact: true,
    })
    .click();
  return {
    messages,
    sockets,
    uploads,
    discoveries,
    hold: () => {
      holding = true;
    },
    release: () => {
      holding = false;
      release?.();
    },
    played: () =>
      messages.filter((message) =>
        ["haptic-preset", "audio-haptics", "animation-haptics", "play"].includes(message.type),
      ),
  };
}

test("a temporary local media-session failure retries on Play without reconnecting the phone", async ({
  page,
}) => {
  const session = await phone(page, 1);
  await selectAudio(page);
  await expect.poll(() => session.discoveries.length).toBe(1);
  const connections = session.sockets.length;
  await page.locator(".pattern-header").getByRole("button", { name: "Play", exact: true }).click();
  await expect.poll(() => session.played().length).toBe(1);
  expect(session.played()[0]).toMatchObject({ type: "audio-haptics", name: "FanfareSound" });
  expect(session.discoveries).toHaveLength(2);
  expect(session.sockets).toHaveLength(connections);
});

test("an active loop uses the current phone session after reconnect without manual restart", async ({
  page,
}) => {
  test.setTimeout(60000);
  const session = await phone(page);
  await selectAudio(page);
  await page.getByRole("tab", { name: "inspector", exact: true }).click();
  await page.getByRole("switch", { name: "Loop", exact: true }).check();
  const header = page.locator(".pattern-header");
  await header.getByRole("button", { name: "Play", exact: true }).click();
  await expect.poll(() => session.played().length).toBe(1);
  const connections = session.sockets.length;
  await session.sockets.at(-1)!.close({ code: 1006 });
  await expect.poll(() => session.sockets.length).toBe(connections + 1);
  await expect.poll(() => session.played().length, { timeout: 10000 }).toBeGreaterThan(1);
  expect(
    session
      .played()
      .every((message) => message.type === "audio-haptics" && message.name === "FanfareSound"),
  ).toBe(true);
  expect(session.uploads).toHaveLength(1);
  await expect(header.getByRole("button", { name: "Stop", exact: true })).toBeVisible();
  await header.getByRole("button", { name: "Stop", exact: true }).click();
});

async function selectAudio(page: Page) {
  await page
    .getByRole("complementary", { name: "Project patterns", exact: true })
    .getByRole("button", { name: "FanfareSound", exact: true })
    .click();
  await page.getByRole("tab", { name: "sound", exact: true }).click();
  await expect(page.getByRole("tabpanel", { name: "sound", exact: true })).toContainText(
    "fanfaresound.mp3",
  );
}

test("editor Play uploads the attached audio once and delivers its complete pattern and source trim", async ({
  page,
}) => {
  const session = await phone(page);
  await selectAudio(page);
  await page.getByRole("button", { name: "Open trimming tool", exact: true }).click();
  const trim = page.getByRole("dialog", { name: "Audio trim", exact: true });
  await trim.getByRole("spinbutton", { name: "Start", exact: true }).fill("500");
  await trim.getByRole("spinbutton", { name: "End", exact: true }).fill("4000");
  await trim.getByRole("button", { name: "Apply trim", exact: true }).click();
  await page.getByRole("tab", { name: "inspector", exact: true }).click();
  await page.getByRole("spinbutton", { name: "Playback range start", exact: true }).fill("200");
  await page.getByRole("spinbutton", { name: "Playback range end", exact: true }).fill("3000");
  const cursor = page.getByRole("slider", { name: "Scrub position", exact: true });
  for (let index = 0; index < 10; index++) await cursor.press("Shift+ArrowRight");
  const preset = await storedPreset(page);
  const header = page.locator(".pattern-header");
  await header.getByRole("button", { name: "Play", exact: true }).click();
  await expect.poll(() => session.played().length).toBe(1);
  const message = session.played()[0];
  if (message?.type !== "audio-haptics") throw new Error("Missing attached audio delivery");
  const pattern = toDevice(preset.pattern);
  const clipId = hash(sample["audio/fanfaresound.mp3"]!);
  expect(message).toMatchObject({
    resourceId: preset.id,
    name: preset.name,
    durationMs: 5187,
    pattern,
    window: { startMs: 500, durationMs: 3500 },
    version: hash(JSON.stringify({ pattern, clipId, window: { startMs: 500, durationMs: 3500 } })),
    audio: { clipId, contentType: "audio/mpeg" },
  });
  expect(message).not.toHaveProperty("volume");
  expect(message).not.toHaveProperty("offsetMs");
  expect(session.uploads).toHaveLength(1);
  expect(session.uploads[0]?.bytes).toEqual(Buffer.from(sample["audio/fanfaresound.mp3"]!));
  expect(new URL(session.uploads[0]!.url).origin).toBe(new URL(page.url()).origin);
  await expect(header.getByRole("button", { name: "Play", exact: true })).toBeVisible({
    timeout: 10000,
  });
  await header.getByRole("button", { name: "Play", exact: true }).click();
  await expect.poll(() => session.played().length).toBe(2);
  expect(session.uploads).toHaveLength(1);
});

test("editor Play delivers the attached Lottie bytes and exact animation metadata", async ({
  page,
}) => {
  const session = await phone(page);
  await page.getByRole("tab", { name: "animation", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Animation canvas preview", exact: true }).locator("canvas"),
  ).toBeVisible();
  const preset = await storedPreset(page);
  await page.locator(".pattern-header").getByRole("button", { name: "Play", exact: true }).click();
  await expect.poll(() => session.played().length).toBe(1);
  const message = session.played()[0];
  if (message?.type !== "animation-haptics") throw new Error("Missing attached animation delivery");
  const source = sample["animation/explosionanimation.json"]!;
  const data = JSON.parse(Buffer.from(source).toString()) as {
    fr: number;
    ip: number;
    op: number;
    w: number;
    h: number;
  };
  const clipId = hash(source);
  const pattern = toDevice(preset.pattern);
  expect(message).toMatchObject({
    resourceId: preset.id,
    name: preset.name,
    durationMs: 2333,
    pattern,
    version: hash(JSON.stringify({ pattern, clipId })),
    animation: {
      clipId,
      totalFrames: data.op - data.ip,
      frameRate: data.fr,
      width: data.w,
      height: data.h,
    },
  });
  expect(session.uploads).toHaveLength(1);
  expect(session.uploads[0]?.bytes).toEqual(Buffer.from(source));
});

test("Stop and immediate Play share the pending clip but only the new playback reaches the phone", async ({
  page,
}) => {
  const session = await phone(page);
  await selectAudio(page);
  session.hold();
  const header = page.locator(".pattern-header");
  await header.getByRole("button", { name: "Play", exact: true }).click();
  await expect.poll(() => session.uploads.length).toBe(1);
  await header.getByRole("button", { name: "Stop", exact: true }).click();
  await header.getByRole("button", { name: "Play", exact: true }).click();
  session.release();
  await expect.poll(() => session.played().length).toBe(1);
  expect(session.played()[0]).toMatchObject({ type: "audio-haptics", name: "FanfareSound" });
  expect(session.uploads).toHaveLength(1);
});

for (const change of ["preset", "project", "reconnect", "return"] as const) {
  test(`${change} changes cannot send an obsolete media upload to the phone`, async ({ page }) => {
    if (change === "reconnect") test.setTimeout(60000);
    const session = await phone(page);
    await selectAudio(page);
    if (change === "reconnect") {
      await page.getByRole("tab", { name: "inspector", exact: true }).click();
      await page.getByRole("switch", { name: "Loop", exact: true }).check();
    }
    session.hold();
    const header = page.locator(".pattern-header");
    await header.getByRole("button", { name: "Play", exact: true }).click();
    await expect.poll(() => session.uploads.length).toBe(1);
    if (change === "preset" || change === "return")
      await page
        .getByRole("complementary", { name: "Project patterns", exact: true })
        .getByRole("button", { name: "JustHaptics", exact: true })
        .click();
    else if (change === "project") {
      await page.getByRole("button", { name: "Projects", exact: true }).click();
      await page
        .locator(".project-dashboard-header")
        .getByRole("button", { name: "Create new project", exact: true })
        .click();
      const dialog = page.getByRole("dialog", { name: "Create project", exact: true });
      await dialog
        .getByRole("textbox", { name: "Project name", exact: true })
        .fill("Fresh project");
      await dialog.getByRole("button", { name: "Create", exact: true }).click();
    } else {
      const count = session.sockets.length;
      await session.sockets.at(-1)!.close({ code: 1006 });
      await expect.poll(() => session.sockets.length).toBe(count + 1);
      await expect(header.getByRole("button", { name: "Stop", exact: true })).toBeVisible();
    }
    if (change === "return") {
      await selectAudio(page);
      await header.getByRole("button", { name: "Play", exact: true }).click();
    }
    if (change === "return" || change === "reconnect") {
      await expect.poll(() => session.uploads.length).toBe(2);
      session.release();
      await expect.poll(() => session.played().length).toBe(1);
      const message = session.played()[0];
      if (message?.type !== "audio-haptics") throw new Error("Missing current audio delivery");
      expect(message).toMatchObject({ name: "FanfareSound" });
      expect(new URL(message.audio.downloadUrl).pathname).toContain(session.uploads[1]!.assetId);
      if (change === "reconnect")
        await header.getByRole("button", { name: "Stop", exact: true }).click();
      return;
    }
    session.release();
    if (await header.getByRole("button", { name: "Stop", exact: true }).isVisible())
      await header.getByRole("button", { name: "Stop", exact: true }).click();
    await expect(header.getByRole("button", { name: "Play", exact: true })).toBeVisible();
    expect(session.played()).toHaveLength(0);
    await expect(
      page.getByRole("alert").filter({ hasText: "Phone playback could not start" }),
    ).toHaveCount(0);
    if (change === "preset") {
      await header.getByRole("button", { name: "Play", exact: true }).click();
      await expect.poll(() => session.played().length).toBe(1);
      expect(session.played()[0]).toMatchObject({ type: "haptic-preset", name: "JustHaptics" });
    }
  });
}
