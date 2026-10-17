import { patternTitle, renamePattern } from "./fixtures/pattern-title";
import { expect, type APIRequestContext, type Page } from "@playwright/test";
import { isProject, isRecord, type Project } from "@buzzzz/core";
import { test } from "./hosted.fixture";

const STUDIO = "http://127.0.0.1:5174";
const RELAY = "http://127.0.0.1:8788";
interface IRoom {
  roomId: string;
  hostToken: string;
  pairing: { code: string };
}
interface ICanonical {
  project: Project;
  projectId: string;
  revision: number;
}

test.use({ baseURL: STUDIO, viewport: { width: 1440, height: 1000 }, actionTimeout: 15_000 });
test.describe.configure({ mode: "serial" });
test.setTimeout(90_000);

function roomFrom(value: unknown): IRoom {
  if (
    !isRecord(value) ||
    typeof value.roomId !== "string" ||
    typeof value.hostToken !== "string" ||
    !isRecord(value.pairing) ||
    typeof value.pairing.code !== "string"
  )
    throw new Error("Invalid test room response");
  return {
    roomId: value.roomId,
    hostToken: value.hostToken,
    pairing: { code: value.pairing.code },
  };
}
function trackRooms(page: Page, rooms: IRoom[]) {
  page.on("response", async (response) => {
    if (response.url() === `${RELAY}/v1/rooms` && response.status() === 201) {
      try {
        rooms.push(roomFrom(await response.json()));
      } catch {
        /* A cancelled StrictMode request has no readable body. */
      }
    }
  });
}
const headers = (room: IRoom) => ({ Authorization: `Bearer ${room.hostToken}` });
const roomPath = (room: IRoom) => `${RELAY}/v1/rooms/${room.roomId}`;

async function openHost(page: Page, rooms: IRoom[]): Promise<IRoom> {
  trackRooms(page, rooms);
  await page.goto("/");
  await expect(page.locator('.save-status[data-status="editing"]')).toBeVisible();
  await page.getByRole("button", { name: "MCP", exact: true }).click();
  await expect(page.getByText("In sync with the room", { exact: true })).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: /^ready$/ })).toBeVisible();
  return mountedRoom(page, rooms);
}
async function mountedRoom(page: Page, rooms: IRoom[]): Promise<IRoom> {
  const endpoint = await page.getByRole("textbox", { name: "MCP endpoint" }).inputValue();
  const id = new URL(endpoint).pathname.split("/")[3];
  await expect.poll(() => rooms.some((room) => room.roomId === id)).toBe(true);
  const room = rooms.find((room) => room.roomId === id);
  if (!room) throw new Error("Mounted editor room was not captured");
  return room;
}
async function canonical(request: APIRequestContext, room: IRoom): Promise<ICanonical> {
  const response = await request.get(`${roomPath(room)}/project`, { headers: headers(room) });
  if (!response.ok()) throw new Error(`Canonical read failed (${response.status()})`);
  const value: unknown = await response.json();
  if (
    !isRecord(value) ||
    !isProject(value.project) ||
    typeof value.projectId !== "string" ||
    typeof value.revision !== "number"
  )
    throw new Error("Invalid canonical test project");
  return { project: value.project, projectId: value.projectId, revision: value.revision };
}
async function tool(
  request: APIRequestContext,
  room: IRoom,
  name: string,
  args: Record<string, unknown>,
) {
  const response = await request.post(`${roomPath(room)}/mcp`, {
    headers: { ...headers(room), "MCP-Protocol-Version": "2025-11-25" },
    data: { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } },
  });
  const value: unknown = await response.json();
  if (
    !response.ok() ||
    !isRecord(value) ||
    !isRecord(value.result) ||
    value.result.isError !== false
  )
    throw new Error(`Hosted MCP ${name} failed`);
  return value.result.structuredContent;
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
  await expect(patternTitle(page)).toBeVisible();
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
}
async function privateCatalog(page: Page) {
  return page.evaluate(() =>
    Object.fromEntries(
      Object.keys(localStorage)
        .filter((key) => key.startsWith("buzzzz.project."))
        .map((key) => [key, localStorage.getItem(key)]),
    ),
  );
}
async function sharedProject(request: APIRequestContext, link: string): Promise<Project> {
  const url = new URL(link);
  const response = await request.get(
    `${RELAY}/v1/shares/${url.searchParams.get("shareRoom")}/${url.searchParams.get("shareId")}`,
    { params: { token: url.searchParams.get("shareToken") ?? "" } },
  );
  const value: unknown = await response.json();
  if (!response.ok() || !isRecord(value) || !isProject(value.project))
    throw new Error("Public test share could not be read");
  return value.project;
}
async function revokeRooms(request: APIRequestContext, rooms: IRoom[]) {
  for (const room of rooms) await request.delete(roomPath(room), { headers: headers(room) });
}

test("hosted pairing and MCP commands reach the mounted editor and its saved project", async ({
  page,
  request,
  browserCallerIp,
}) => {
  const rooms: IRoom[] = [];
  const frames: string[] = [];
  const errors: string[] = [];
  const phones: WebSocket[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("websocket", (socket) => {
    if (!socket.url().startsWith("ws://127.0.0.1:8788/relay")) return;
    const capture = (frame: { payload: string | Buffer }) => {
      try {
        const value: unknown = JSON.parse(String(frame.payload));
        if (isRecord(value) && typeof value.type === "string") frames.push(value.type);
      } catch {
        /* Ignore non-JSON keepalives. */
      }
    };
    socket.on("framereceived", capture);
    socket.on("framesent", capture);
  });
  try {
    const room = await openHost(page, rooms);
    let initialPairingCode: string | undefined;
    await page.route(`${roomPath(room)}/pairing`, async (route) => {
      const response = await route.fetch({
        headers: { ...route.request().headers(), "cf-connecting-ip": browserCallerIp },
      });
      const value: unknown = await response.json();
      if (
        response.ok() &&
        isRecord(value) &&
        typeof value.code === "string" &&
        !route.request().failure()
      )
        initialPairingCode ??= value.code;
      if (isRecord(value) && typeof value.code === "string" && value.code === initialPairingCode) {
        await route.fulfill({ response, json: { ...value, expiresAt: Date.now() + 1100 } });
      } else await route.fulfill({ response });
    });
    await page.getByRole("button", { name: "Device", exact: true }).click();
    await page.getByRole("button", { name: "Connect device", exact: true }).click();
    const code = page.getByLabel("Pairing code", { exact: true });
    await expect(code).toHaveText(/^\d{6}$/);
    await expect
      .poll(async () => {
        const current = await code.textContent();
        return current !== initialPairingCode && /^\d{6}$/.test(current ?? "");
      })
      .toBe(true);
    async function pairVisibleCode() {
      const paired = await request.post(`${roomPath(room)}/pair`, {
        data: { code: await code.textContent(), device: "Hosted browser test" },
      });
      const body: unknown = await paired.json();
      if (paired.status() !== 201 || !isRecord(body) || typeof body.relayUrl !== "string")
        throw new Error("Hosted phone pairing failed");
      const phone = new WebSocket(body.relayUrl);
      phones.push(phone);
      await expect.poll(() => phone.readyState).toBe(WebSocket.OPEN);
      phone.send(JSON.stringify({ type: "hello", device: "Hosted browser test" }));
    }
    await pairVisibleCode();
    await expect(page.getByText("1 connected", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Pair another phone", exact: true }).click();
    await expect(code).toHaveText(/^\d{6}$/);
    await pairVisibleCode();
    await expect(page.getByText("2 connected", { exact: true })).toBeVisible();
    expect(
      await tool(request, room, "editor_range", { enabled: true, startMs: 100, endMs: 250 }),
    ).toEqual({ enabled: true, startMs: 100, endMs: 250 });
    await expect(
      page.getByRole("slider", { name: "Playback range start", exact: true }),
    ).toHaveAttribute("aria-valuenow", "100");
    await expect(
      page.getByRole("slider", { name: "Playback range end", exact: true }),
    ).toHaveAttribute("aria-valuenow", "250");
    expect(frames).toContain("editor-command");
    expect(frames).toContain("editor-result");
    await expect
      .poll(async () => (await canonical(request, room)).project.presets[0]?.editor?.range, {
        intervals: [500, 1000, 2000],
      })
      .toEqual({ start: 100, end: 250 });
    const state = await canonical(request, room);
    const preset = state.project.presets[0]!;
    await tool(request, room, "upsert_pattern", {
      id: preset.id,
      name: "Hosted MCP pattern",
      pattern: preset.pattern,
      baseRevision: state.revision,
    });
    await expect(patternTitle(page)).toHaveText("Hosted MCP pattern");
    await expect
      .poll(async () =>
        Object.values(await privateCatalog(page)).some((value) =>
          value?.includes('"name":"Hosted MCP pattern"'),
        ),
      )
      .toBe(true);
    expect(errors).toEqual([]);
  } finally {
    for (const phone of phones) phone.close();
    await page.close();
    await revokeRooms(request, rooms);
  }
});

test("public shares stay bound to their project and recipients preserve private catalogs", async ({
  page,
  createHostedContext,
  request,
}) => {
  const rooms: IRoom[] = [];
  const recipient = await createHostedContext();
  recipient.on("page", (next) => trackRooms(next, rooms));
  try {
    const room = await openHost(page, rooms);
    await renameProject(page, "Public A");
    await renamePattern(page, "Public A pattern");
    const initial = await canonical(request, room);
    await expect
      .poll(async () => (await canonical(request, room)).project.presets[0]?.name, {
        intervals: [500, 1000, 2000],
      })
      .toBe("Public A pattern");
    await page.getByRole("button", { name: "Share", exact: true }).click();
    await page.getByRole("button", { name: "Create public link", exact: true }).click();
    const shareField = page.getByRole("textbox", { name: "Shared project link" });
    await expect(shareField).toBeVisible();
    const link = await shareField.inputValue();
    const publicA = await sharedProject(request, link);
    await page.getByRole("button", { name: "Projects", exact: true }).click();
    await createProject(page);
    await renameProject(page, "Private B");
    await renamePattern(page, "Private B pattern");
    await expect
      .poll(
        async () => {
          const state = await canonical(request, room);
          return (
            state.projectId !== initial.projectId &&
            state.project.presets[0]?.name === "Private B pattern"
          );
        },
        { intervals: [500, 1000, 2000] },
      )
      .toBe(true);
    const privateB = await canonical(request, room);
    await tool(request, room, "upsert_pattern", {
      ...privateB.project.presets[0],
      name: "Private B from MCP",
      baseRevision: privateB.revision,
    });
    await expect(patternTitle(page)).toHaveText("Private B from MCP");
    expect(await sharedProject(request, link)).toEqual(publicA);
    await page.getByRole("button", { name: "Projects", exact: true }).click();
    await page
      .getByRole("region", { name: "Projects", exact: true })
      .locator(".project-card-open")
      .filter({ hasText: "Public A" })
      .click();
    await expect(patternTitle(page)).toHaveText("Public A pattern");
    await page.getByRole("button", { name: "Share", exact: true }).click();
    await expect(page.getByRole("button", { name: "Revoke link", exact: true })).toBeVisible();
    expect((await shareField.inputValue()) === link).toBe(true);
    const privateId = crypto.randomUUID();
    const privateKey = `buzzzz.project.${privateId}`;
    const privateRecord = JSON.stringify({
      id: privateId,
      name: "Recipient private",
      createdAt: 1,
      updatedAt: 1,
      revision: 0,
      project: privateB.project,
    });
    await recipient.addInitScript(
      ({ privateKey, privateRecord, privateId }) => {
        if (localStorage.getItem("hosted-test-seeded")) return;
        localStorage.setItem(privateKey, privateRecord);
        localStorage.setItem("buzzzz.lastProject", privateId);
        localStorage.setItem("hosted-test-seeded", "yes");
      },
      { privateKey, privateRecord, privateId },
    );
    const first = await recipient.newPage();
    await first.goto(link);
    await expect(patternTitle(first)).toHaveText("Public A pattern");
    const follower = await recipient.newPage();
    let publicReads = 0;
    follower.on("request", (request) => {
      if (request.url().startsWith(`${RELAY}/v1/shares/`)) publicReads++;
    });
    await follower.goto(link);
    await expect(follower.locator('.save-status[data-status="read-only"]')).toBeVisible();
    expect(publicReads).toBe(0);
    await first.close();
    await expect(follower.locator('.save-status[data-status="editing"]')).toBeVisible();
    await expect.poll(() => publicReads).toBeGreaterThan(0);
    await expect(patternTitle(follower)).toHaveText("Public A pattern");
    expect(await privateCatalog(follower)).toEqual({ [privateKey]: privateRecord });
    expect(await follower.evaluate(() => localStorage.getItem("buzzzz.lastProject"))).toBe(
      privateId,
    );
    const readsBeforePrivate = publicReads;
    await follower.getByRole("button", { name: "Projects", exact: true }).click();
    await follower
      .getByRole("region", { name: "Projects", exact: true })
      .locator(".project-card-open")
      .filter({ hasText: "Recipient private" })
      .click();
    await expect(patternTitle(follower)).toHaveText(privateB.project.presets[0]!.name);
    await follower.getByRole("button", { name: "MCP", exact: true }).click();
    await expect(follower.getByText("In sync with the room", { exact: true })).toBeVisible();
    await expect(follower.getByRole("status").filter({ hasText: /^ready$/ })).toBeVisible();
    const followerRoom = await mountedRoom(follower, rooms);
    await expect
      .poll(async () => (await canonical(request, followerRoom)).projectId, {
        intervals: [500, 1000, 2000],
      })
      .toBe(privateId);
    expect(publicReads).toBe(readsBeforePrivate);
    expect(await privateCatalog(follower)).toEqual({ [privateKey]: privateRecord });
    await expect(patternTitle(follower)).toHaveText(privateB.project.presets[0]!.name);
    await page.getByRole("button", { name: "Revoke link", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Create public link", exact: true }),
    ).toBeVisible();
  } finally {
    await recipient.close();
    await page.close();
    await revokeRooms(request, rooms);
  }
});
