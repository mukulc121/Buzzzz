import { editorPlay, editorStop } from "./fixtures/editor-playback";
import { renamePattern } from "./fixtures/pattern-title";
import { createHash } from "node:crypto";
import { expect, test, type Page, type WebSocketRoute } from "@playwright/test";
import { parseMessage, patternEnd, rangePattern, toDevice, type Msg } from "@buzzzz/core";
import { isProjectRecord } from "../../apps/studio/src/features/project/model";

async function savedProject(page: Page) {
  const value: unknown = await page.evaluate(() => {
    const id = localStorage.getItem("buzzzz.lastProject");
    return JSON.parse(localStorage.getItem(`buzzzz.project.${id}`) ?? "null");
  });
  if (!isProjectRecord(value)) throw new Error("Missing saved project");
  return value.project;
}

async function relay(page: Page) {
  const messages: Msg[] = [];
  const sockets: WebSocketRoute[] = [];
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
  await expect
    .poll(() => messages.some((message) => message.type === "library-manifest"))
    .toBe(true);
  return {
    messages,
    sockets,
    manifests: () => messages.filter((message) => message.type === "library-manifest"),
    played: () => messages.filter((message) => message.type === "haptic-preset"),
  };
}

test("phone manifests debounce names, answer requests, and resend after phone or Studio reconnect", async ({
  page,
}) => {
  await page.clock.install();
  const phone = await relay(page);
  const initial = await savedProject(page);
  const manifest = () => ({
    type: "library-manifest",
    presets: initial.presets.map((preset) => ({ resourceId: preset.id, name: preset.name })),
  });
  expect(phone.manifests().at(-1)).toEqual(manifest());
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 5000));
  phone.messages.length = 0;
  await renamePattern(page, "Phone preview");
  await page.clock.runFor(299);
  expect(phone.manifests()).toHaveLength(0);
  await renamePattern(page, "Renamed preview");
  await page.clock.runFor(299);
  expect(phone.manifests()).toHaveLength(0);
  await page.clock.runFor(1);
  await expect.poll(() => phone.manifests().length).toBe(1);
  initial.presets[0]!.name = "Renamed preview";
  expect(phone.manifests()[0]).toEqual(manifest());
  await page.getByRole("button", { name: "New pattern", exact: true }).click();
  await page.clock.runFor(299);
  expect(phone.manifests()).toHaveLength(1);
  await page.clock.runFor(1);
  await expect.poll(() => phone.manifests().length).toBe(2);
  initial.presets = (await savedProject(page)).presets;
  expect(phone.manifests().at(-1)).toEqual(manifest());
  const socket = phone.sockets.at(-1)!;
  socket.send(JSON.stringify({ type: "library-manifest-request" }));
  await page.clock.runFor(1);
  await expect.poll(() => phone.manifests().length).toBe(3);
  expect(phone.manifests().at(-1)).toEqual(manifest());
  socket.send(JSON.stringify({ type: "peers", phones: 0 }));
  socket.send(JSON.stringify({ type: "peers", phones: 1 }));
  await page.clock.runFor(1);
  await expect.poll(() => phone.manifests().length).toBe(4);
  const connections = phone.sockets.length;
  await socket.close({ code: 1006 });
  await page.clock.runFor(1500);
  await expect.poll(() => phone.sockets.length).toBe(connections + 1);
  await expect.poll(() => phone.manifests().length).toBeGreaterThan(4);
  expect(phone.manifests().at(-1)).toEqual(manifest());
  expect(
    phone.messages.filter((message) => message.type === "play" || message.type === "haptic-preset"),
  ).toHaveLength(0);
});

test("editor Play sends one named, hashed device pattern without legacy duplicate playback", async ({
  page,
}) => {
  const phone = await relay(page);
  const preset = (await savedProject(page)).presets[0]!;
  await editorPlay(page).click();
  await expect.poll(() => phone.played().length).toBe(1);
  const pattern = toDevice(rangePattern(preset.pattern, 0, patternEnd(preset.pattern)));
  expect(phone.played()[0]).toEqual({
    type: "haptic-preset",
    resourceId: preset.id,
    name: preset.name,
    version: createHash("sha256").update(JSON.stringify(pattern)).digest("hex"),
    pattern,
  });
  await expect(editorPlay(page)).toBeVisible();
  expect(phone.played()).toHaveLength(1);
  expect(phone.messages.filter((message) => message.type === "play")).toHaveLength(0);
});

test("library Play sends its own source identity and leaves the editor clock stopped", async ({
  page,
}) => {
  const phone = await relay(page);
  await page.getByRole("button", { name: "Tools", exact: true }).click();
  await page.getByRole("button", { name: "Pulsar Library", exact: true }).click();
  const library = page.getByRole("region", { name: "Pulsar Library", exact: true });
  await library.getByRole("searchbox").fill("Thunder");
  await library.getByRole("button", { name: "About Thunder", exact: true }).click();
  const detail = page.getByRole("dialog", { name: "Thunder", exact: true });
  expect(phone.played()).toHaveLength(0);
  await detail.getByRole("button", { name: "Play", exact: true }).click();
  await expect.poll(() => phone.played().length).toBe(1);
  const message = phone.played()[0]!;
  expect(message).toMatchObject({ resourceId: "library:thunder", name: "Thunder" });
  expect(message.version).toBe(
    createHash("sha256").update(JSON.stringify(message.pattern)).digest("hex"),
  );
  await expect(editorStop(page)).toBeVisible();
  await expect(page.locator(".chart [data-playhead]")).toHaveAttribute("aria-valuenow", "0");
  expect(phone.messages.filter((item) => item.type === "play")).toHaveLength(0);
  await detail.getByRole("button", { name: "Close", exact: true }).click();
});

test("Stop cancels a pending pattern hash before it can reach the phone", async ({ page }) => {
  await page.clock.install();
  await page.addInitScript(() => {
    const digest = crypto.subtle.digest.bind(crypto.subtle);
    const pending: (() => void)[] = [];
    crypto.subtle.digest = (algorithm, data) =>
      new Promise((resolve, reject) => {
        pending.push(() => void digest(algorithm, data).then(resolve, reject));
      });
    Object.assign(window, {
      phoneDigest: {
        count: () => pending.length,
        release: () => pending.splice(0).forEach((run) => run()),
      },
    });
  });
  const phone = await relay(page);
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 5000));
  await editorPlay(page).click();
  await expect.poll(() => page.evaluate(() => Reflect.get(window, "phoneDigest").count())).toBe(1);
  await editorStop(page).click();
  const stoppedAt = phone.messages.length;
  await page.evaluate(() => Reflect.get(window, "phoneDigest").release());
  await editorPlay(page).click();
  await expect.poll(() => page.evaluate(() => Reflect.get(window, "phoneDigest").count())).toBe(1);
  expect(phone.messages.slice(stoppedAt).some((message) => message.type === "haptic-preset")).toBe(
    false,
  );
  await page.evaluate(() => Reflect.get(window, "phoneDigest").release());
  await expect.poll(() => phone.played().length).toBe(1);
  expect(phone.messages.filter((message) => message.type === "play")).toHaveLength(0);
});
