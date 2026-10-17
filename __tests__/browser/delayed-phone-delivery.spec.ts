import { editorPlay } from "./fixtures/editor-playback";
import { createHash } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { parseMessage, type Msg } from "@buzzzz/core";

async function pairedPhone(page: Page) {
  const messages: Msg[] = [];
  await page.routeWebSocket("**/relay?role=studio", (socket) => {
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
  return () =>
    messages.filter((message) =>
      ["haptic-preset", "audio-haptics", "animation-haptics", "play"].includes(message.type),
    );
}

test("a media upload finishing after a short preview still delivers once without restarting it", async ({
  page,
}) => {
  const roomId = "a".repeat(32);
  const origin = "http://192.168.0.111:5173";
  let release = () => {};
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  let uploads = 0;
  await page.route("**/media/session", (route) =>
    route.fulfill({ json: { origin, roomId, hostToken: "b".repeat(43) } }),
  );
  await page.route("**/v1/rooms/*/assets?kind=media", async (route) => {
    const bytes = route.request().postDataBuffer();
    if (!bytes) throw new Error("The upload must include the attached audio");
    uploads++;
    await pending;
    const assetId = `${"c".repeat(32)}.bin`;
    await route.fulfill({
      json: {
        assetId,
        path: `${origin}/v1/rooms/${roomId}/assets/${assetId}?token=${"d".repeat(43)}`,
        bytes: bytes.byteLength,
      },
    });
  });
  const played = await pairedPhone(page);
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await page
    .locator(".project-dashboard-header")
    .getByRole("button", { name: "Create sample project", exact: true })
    .click();
  const pattern = page
    .getByRole("complementary", { name: "Project patterns", exact: true })
    .getByRole("button", { name: "FanfareSound", exact: true });
  await pattern.click();
  await expect(pattern).toHaveAttribute("aria-current", "true");
  await page.getByRole("tab", { name: "inspector", exact: true }).click();
  await page.getByRole("spinbutton", { name: "Playback range end", exact: true }).fill("150");
  await editorPlay(page).click();
  await expect.poll(() => uploads).toBe(1);
  await expect(editorPlay(page)).toBeVisible();
  expect(played()).toEqual([]);
  release();
  await expect.poll(() => played().length).toBe(1);
  expect(played()[0]).toMatchObject({ type: "audio-haptics", name: "FanfareSound" });
  await expect(editorPlay(page)).toBeVisible();
  expect(uploads).toBe(1);
  expect(played()).toHaveLength(1);
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("a short library audition delivers a delayed pattern hash after its sound completes", async ({
  page,
}) => {
  const played = await pairedPhone(page);
  await page.getByRole("button", { name: "Tools", exact: true }).click();
  await page.getByRole("button", { name: "Pulsar Library", exact: true }).click();
  const library = page.getByRole("region", { name: "Pulsar Library", exact: true });
  await library.getByRole("searchbox").fill("Afterglow");
  await library.getByRole("button", { name: "About Afterglow", exact: true }).click();
  const detail = page.getByRole("dialog", { name: "Afterglow", exact: true });
  let hashes = 0;
  await page.exposeFunction("phoneHashStarted", () => hashes++);
  await page.evaluate(() => {
    const notify: unknown = Reflect.get(window, "phoneHashStarted");
    if (typeof notify !== "function") throw new Error("Missing phone hash observer");
    const digest = crypto.subtle.digest.bind(crypto.subtle);
    const pending = new Promise<void>((resolve) => {
      window.addEventListener("release-phone-hash", () => resolve(), { once: true });
    });
    crypto.subtle.digest = (algorithm, data) => {
      void notify();
      return pending.then(() => digest(algorithm, data));
    };
  });
  await detail.getByRole("button", { name: "Play", exact: true }).click();
  await expect.poll(() => hashes).toBe(1);
  await expect(detail.getByRole("button", { name: "Play", exact: true })).toBeVisible();
  expect(played()).toEqual([]);
  await page.evaluate(() => window.dispatchEvent(new Event("release-phone-hash")));
  await expect.poll(() => played().length).toBe(1);
  const message = played()[0];
  if (message?.type !== "haptic-preset") throw new Error("Missing named library delivery");
  expect(message).toMatchObject({ resourceId: "library:afterglow", name: "Afterglow" });
  expect(message.version).toBe(
    createHash("sha256").update(JSON.stringify(message.pattern)).digest("hex"),
  );
  await expect(detail.getByRole("button", { name: "Play", exact: true })).toBeVisible();
  await expect(editorPlay(page)).toBeVisible();
  expect(played()).toHaveLength(1);
  await expect(page.getByRole("alert")).toHaveCount(0);
});
