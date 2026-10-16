import { expect, type APIRequestContext, type Page } from "@playwright/test";
import { isProject, isRecord } from "@buzzzz/core";
import { test } from "./hosted.fixture";

const STUDIO = "http://127.0.0.1:5174";
const RELAY = "http://127.0.0.1:8788";

interface IRoom {
  roomId: string;
  hostToken: string;
}

function captureRooms(page: Page, rooms: IRoom[]) {
  page.on("response", async (response) => {
    if (response.url() !== `${RELAY}/v1/rooms` || response.status() !== 201) return;
    try {
      const value: unknown = await response.json();
      if (
        isRecord(value) &&
        typeof value.roomId === "string" &&
        typeof value.hostToken === "string"
      )
        rooms.push({ roomId: value.roomId, hostToken: value.hostToken });
    } catch {
      /* Cancelled StrictMode requests may have no response body. */
    }
  });
}
async function mountedRoom(page: Page, rooms: IRoom[]) {
  await expect(page.locator('.save-status[data-status="editing"]')).toBeVisible();
  await page.getByRole("button", { name: "MCP", exact: true }).click();
  await expect(page.getByText("In sync with the room", { exact: true })).toBeVisible();
  const field = page.getByRole("textbox", { name: "MCP endpoint" });
  await expect(field).toHaveValue(/\/v1\/rooms\/[a-f0-9]{32}\/mcp$/);
  const id = new URL(await field.inputValue()).pathname.split("/")[3];
  await expect.poll(() => rooms.some((room) => room.roomId === id)).toBe(true);
  const room = rooms.find((room) => room.roomId === id);
  if (!room) throw new Error("Mounted room was not captured");
  return room;
}
function publicUrl(link: string) {
  const editor = new URL(link);
  const url = new URL(
    `/v1/shares/${editor.searchParams.get("shareRoom")}/${editor.searchParams.get("shareId")}`,
    RELAY,
  );
  url.searchParams.set("token", editor.searchParams.get("shareToken") ?? "");
  return url.href;
}
async function publicStatus(request: APIRequestContext, link: string) {
  return (await request.get(publicUrl(link))).status();
}
async function catalog(page: Page) {
  return page.evaluate(() => ({
    last: localStorage.getItem("buzzzz.lastProject"),
    records: Object.fromEntries(
      Object.keys(localStorage)
        .filter((key) => key.startsWith("buzzzz.project."))
        .map((key) => [key, localStorage.getItem(key)]),
    ),
  }));
}
async function canonical(request: APIRequestContext, room: IRoom) {
  const response = await request.get(`${RELAY}/v1/rooms/${room.roomId}/project`, {
    headers: { Authorization: `Bearer ${room.hostToken}` },
  });
  const value: unknown = await response.json();
  if (
    !response.ok() ||
    !isRecord(value) ||
    !isProject(value.project) ||
    typeof value.revision !== "number" ||
    typeof value.projectId !== "string"
  )
    throw new Error(`Canonical project unavailable (${response.status()})`);
  return {
    projectId: value.projectId,
    revision: value.revision,
    name: value.project.presets[0]?.name,
  };
}
async function renameProject(page: Page, name: string) {
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  const current = page
    .getByRole("region", { name: "Projects", exact: true })
    .locator(".project-card")
    .filter({ has: page.locator('[aria-current="true"]') });
  await current.getByRole("button", { name: /^Actions for / }).click();
  await page.getByRole("menuitem", { name: "Rename", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Rename project" });
  await dialog.getByRole("textbox", { name: "Project name" }).fill(name);
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await current.getByRole("button", { name, exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Pattern name" })).toBeEnabled();
}
async function createProject(page: Page) {
  await page
    .getByRole("region", { name: "Projects", exact: true })
    .getByRole("button", { name: "Create new project", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "Create project" })
    .getByRole("textbox", { name: "Project name" })
    .fill("Test project");
  await page
    .getByRole("dialog", { name: "Create project" })
    .getByRole("button", { name: "Create", exact: true })
    .click();
  await expect(page).toHaveURL(/\/studio\/projects\/[\w-]+(?:[?#]|$)/);
  await expect(page.locator('.save-status[data-status="editing"]')).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Pattern name" })).toHaveValue("Untitled pattern");
  await expect(
    page.getByRole("group", { name: "Haptic pattern timeline" }).getByRole("button"),
  ).toHaveCount(0);
}

test("hosted reload retains room and link, and a fresh tab can revoke earlier links", async ({
  page,
  context,
  request,
}) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  const rooms: IRoom[] = [];
  let fresh: Page | undefined;
  captureRooms(page, rooms);
  try {
    await page.goto(STUDIO);
    const original = await mountedRoom(page, rooms);
    await page.getByRole("textbox", { name: "Pattern name" }).fill("Persistent private pattern");
    await expect
      .poll(async () =>
        JSON.stringify((await catalog(page)).records).includes("Persistent private pattern"),
      )
      .toBe(true);
    await page.getByRole("button", { name: "Share", exact: true }).click();
    await page.getByRole("button", { name: "Create public link", exact: true }).click();
    const field = page.getByRole("textbox", { name: "Shared project link", exact: true });
    await expect(field).toBeVisible();
    const firstLink = await field.inputValue();
    expect(await publicStatus(request, firstLink)).toBe(200);
    const createdBeforeReload = rooms.length;
    await page.reload();
    const restored = await mountedRoom(page, rooms);
    expect(restored.roomId === original.roomId && restored.hostToken === original.hostToken).toBe(
      true,
    );
    expect(rooms.length).toBe(createdBeforeReload);
    await page.getByRole("button", { name: "Share", exact: true }).click();
    await expect(page.getByRole("button", { name: "Revoke link", exact: true })).toBeVisible();
    expect((await field.inputValue()) === firstLink).toBe(true);
    await page.getByRole("button", { name: "Revoke link", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Create public link", exact: true }),
    ).toBeVisible();
    expect(await publicStatus(request, firstLink)).toBe(404);
    await page.getByRole("button", { name: "Create public link", exact: true }).click();
    await expect(field).toBeVisible();
    const earlierLink = await field.inputValue();
    const privateCatalog = await catalog(page);
    await page.close();
    fresh = await context.newPage();
    expect(await fresh.opener()).toBeNull();
    captureRooms(fresh, rooms);
    await fresh.goto(STUDIO);
    const next = await mountedRoom(fresh, rooms);
    expect(next.roomId !== original.roomId).toBe(true);
    await expect(fresh.getByRole("textbox", { name: "Pattern name" })).toHaveValue(
      "Persistent private pattern",
    );
    expect(await catalog(fresh)).toEqual(privateCatalog);
    await fresh.getByRole("button", { name: "Share", exact: true }).click();
    const earlier = fresh.getByRole("region", { name: "Earlier share links", exact: true });
    await expect(earlier).toBeVisible();
    expect(
      (await earlier
        .getByRole("textbox", { name: "Earlier shared project link", exact: true })
        .inputValue()) === earlierLink,
    ).toBe(true);
    expect(await publicStatus(request, earlierLink)).toBe(200);
    const shareId = new URL(earlierLink).searchParams.get("shareId");
    const revoked = fresh.waitForRequest(
      (req) =>
        req.method() === "DELETE" &&
        req.url() === `${RELAY}/v1/rooms/${original.roomId}/shares/${shareId}`,
    );
    await earlier.getByRole("button", { name: "Revoke earlier link", exact: true }).click();
    expect((await revoked).headers().authorization === `Bearer ${original.hostToken}`).toBe(true);
    await expect(earlier).toHaveCount(0);
    expect(await publicStatus(request, earlierLink)).toBe(404);
  } finally {
    await fresh?.close();
    await page.close();
    for (const room of rooms)
      await request.delete(`${RELAY}/v1/rooms/${room.roomId}`, {
        headers: { Authorization: `Bearer ${room.hostToken}` },
      });
  }
});

test("duplicated session storage cannot make two project writers share a relay room", async ({
  page,
  context,
  request,
}) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  const rooms: IRoom[] = [];
  let duplicate: Page | undefined;
  let throttled = 0;
  const observe = (target: Page) => {
    captureRooms(target, rooms);
    target.on("response", (response) => {
      if (response.url().startsWith(RELAY) && response.status() === 429) throttled++;
    });
  };
  observe(page);
  try {
    await page.goto(STUDIO);
    const first = await mountedRoom(page, rooms);
    await renameProject(page, "Owned project P");
    await page.getByRole("textbox", { name: "Pattern name" }).fill("Owned P pattern");
    await expect.poll(async () => (await canonical(request, first)).name).toBe("Owned P pattern");
    const projectP = (await canonical(request, first)).projectId;
    const copied = await page.evaluate(() =>
      Object.fromEntries(
        Object.keys(sessionStorage).map((key) => [key, sessionStorage.getItem(key)]),
      ),
    );
    duplicate = await context.newPage();
    await duplicate.setViewportSize({ width: 1440, height: 1000 });
    observe(duplicate);
    await duplicate.addInitScript(
      ({ origin, copied }) => {
        if (location.origin !== origin) return;
        for (const [key, value] of Object.entries(copied))
          if (value !== null) sessionStorage.setItem(key, value);
      },
      { origin: STUDIO, copied },
    );
    await duplicate.goto(STUDIO);
    await duplicate.getByRole("button", { name: "Projects", exact: true }).click();
    await createProject(duplicate);
    await expect(duplicate.locator('.save-status[data-status="editing"]')).toBeVisible();
    await renameProject(duplicate, "Owned project Q");
    await duplicate.getByRole("textbox", { name: "Pattern name" }).fill("Owned Q pattern");
    const second = await mountedRoom(duplicate, rooms);
    expect(first.roomId !== second.roomId && first.hostToken !== second.hostToken).toBe(true);
    await expect.poll(async () => (await canonical(request, second)).name).toBe("Owned Q pattern");
    const projectQ = (await canonical(request, second)).projectId;
    expect(projectP !== projectQ).toBe(true);
    async function expectStableProjects() {
      let previous = "";
      let stable = 0;
      await expect
        .poll(
          async () => {
            const states = await Promise.all([
              canonical(request, first),
              canonical(request, second),
            ]);
            if (
              states[0].projectId !== projectP ||
              states[0].name !== "Owned P pattern" ||
              states[1].projectId !== projectQ ||
              states[1].name !== "Owned Q pattern"
            ) {
              stable = 0;
              previous = "";
              return 0;
            }
            const next = JSON.stringify(states);
            stable = next === previous ? stable + 1 : 0;
            previous = next;
            return stable;
          },
          { intervals: [1000], timeout: 12_000 },
        )
        .toBeGreaterThanOrEqual(4);
    }
    await expectStableProjects();
    const createdBeforeReload = rooms.length;
    await page.reload();
    await page.getByRole("button", { name: "Projects", exact: true }).click();
    await page
      .getByRole("region", { name: "Projects", exact: true })
      .locator(".project-card-open")
      .filter({ hasText: "Owned project P" })
      .click();
    const restored = await mountedRoom(page, rooms);
    expect(restored.roomId === first.roomId && restored.hostToken === first.hostToken).toBe(true);
    expect(rooms.length).toBe(createdBeforeReload);
    await expectStableProjects();
    await expect(page.getByRole("textbox", { name: "Pattern name" })).toHaveValue(
      "Owned P pattern",
    );
    await expect(duplicate.getByRole("textbox", { name: "Pattern name" })).toHaveValue(
      "Owned Q pattern",
    );
    expect(throttled).toBe(0);
  } finally {
    await duplicate?.close();
    await page.close();
    for (const room of rooms)
      await request.delete(`${RELAY}/v1/rooms/${room.roomId}`, {
        headers: { Authorization: `Bearer ${room.hostToken}` },
      });
  }
});
