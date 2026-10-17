import { openRiveInspector } from "./fixtures/rive-controls";
import { expect, test, type Route, type WebSocketRoute } from "@playwright/test";
import { isProject, isRecord, parseMessage, type Msg, type Project } from "@buzzzz/core";

test("reselecting the Rive owner waits for its replacement upload before publishing a phone load", async ({
  page,
}) => {
  const origin = new URL(test.info().project.use.baseURL ?? "http://127.0.0.1:5173").origin;
  const roomId = "a".repeat(32);
  const messages: Msg[] = [];
  const sockets: WebSocketRoute[] = [];
  const uploads: Route[] = [];
  const revoked = new Set<string>();
  const rejected: string[] = [];
  const errors: string[] = [];
  let canonical: { project: Project | null; projectId: string | null; revision: number } = {
    project: null,
    projectId: null,
    revision: 0,
  };
  const asset = (id: string) =>
    `${origin}/v1/rooms/${roomId}/assets/${id.repeat(32)}.riv?token=${"t".repeat(43)}`;
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route(/\/src\/features\/connection\/cloud\.ts(?:\?.*)?$/, async (route) => {
    const response = await route.fetch();
    const source = await response.text();
    const declaration = "const cloudOrigin = () => {";
    if (!source.includes(declaration)) throw new Error("Missing relay origin resolver");
    await route.fulfill({
      response,
      body: source.replace(declaration, `${declaration} return ${JSON.stringify(origin)};`),
    });
  });
  await page.route(`${origin}/v1/rooms`, (route) =>
    route.fulfill({
      status: 201,
      json: {
        roomId,
        hostToken: "h".repeat(43),
        expiresAt: Date.now() + 86_400_000,
        pairing: { code: "123456", expiresAt: Date.now() + 600_000 },
        relayUrl: `${origin.replace("http", "ws")}/relay?role=studio`,
      },
    }),
  );
  await page.route(`${origin}/v1/rooms/${roomId}/pairing`, (route) =>
    route.fulfill({ json: { code: "123456", expiresAt: Date.now() + 600_000 } }),
  );
  await page.route(`${origin}/v1/rooms/${roomId}/project`, (route) => {
    if (route.request().method() === "PUT") {
      const input: unknown = route.request().postDataJSON();
      if (!isRecord(input) || !isProject(input.project) || typeof input.projectId !== "string")
        throw new Error("Invalid room project publication");
      canonical = {
        project: input.project,
        projectId: input.projectId,
        revision: canonical.revision + 1,
      };
    }
    return route.fulfill({ json: canonical });
  });
  await page.route(`${origin}/v1/rooms/${roomId}/assets**`, async (route) => {
    if (route.request().method() === "POST") {
      uploads.push(route);
      return;
    }
    expect(route.request().method()).toBe("DELETE");
    revoked.add(new URL(route.request().url()).pathname);
    await route.fulfill({ json: { revoked: true } });
  });
  await page.routeWebSocket("**/relay?role=studio", (socket) => {
    sockets.push(socket);
    socket.onMessage((data) => {
      const message = typeof data === "string" ? parseMessage(data) : null;
      if (!message) return;
      messages.push(message);
      if (message.type === "load" && revoked.has(new URL(message.riv).pathname)) {
        rejected.push("revoked Rive load");
        socket.close({ code: 1008, reason: "Asset not found" });
      }
    });
    socket.send(JSON.stringify({ type: "peers", phones: 1 }));
  });
  const loads = () => messages.filter((message) => message.type === "load");
  const panel = page.locator(".rive-inspector");
  await page.goto("/");
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await page.getByRole("button", { name: "Create sample project", exact: true }).click();
  await page.getByRole("button", { name: "DexTourLoader", exact: true }).click();
  await openRiveInspector(page);
  await expect(panel.getByRole("button", { name: "Fire isLoaded", exact: true })).toBeVisible({
    timeout: 15_000,
  });
  await expect.poll(() => uploads.length).toBe(1);
  await uploads[0]!.fulfill({ json: { path: asset("b") } });
  await expect.poll(() => loads().length).toBe(1);
  expect(loads()[0]?.riv).toBe(asset("b"));
  await page.getByRole("button", { name: "JustHaptics", exact: true }).click();
  await expect(panel).toHaveCount(0);
  await expect.poll(() => revoked.size).toBe(1);
  expect(uploads).toHaveLength(1);
  expect(loads()).toHaveLength(1);
  await page.getByRole("button", { name: "DexTourLoader", exact: true }).click();
  await openRiveInspector(page);
  await expect.poll(() => uploads.length).toBe(2);
  await expect(panel.getByRole("button", { name: "Fire isLoaded", exact: true })).toBeVisible();
  await expect(panel.getByRole("button", { name: "Resume", exact: true })).toBeVisible({
    timeout: 15_000,
  });
  expect(loads()).toHaveLength(1);
  expect(sockets).toHaveLength(1);
  expect(rejected).toEqual([]);
  await uploads[1]!.fulfill({ json: { path: asset("c") } });
  await expect.poll(() => loads().length).toBe(2);
  expect(loads()[1]?.riv).toBe(asset("c"));
  await sockets[0]!.close({ code: 1006 });
  await expect.poll(() => sockets.length).toBe(2);
  await expect.poll(() => loads().length).toBe(3);
  expect(loads()[2]?.riv).toBe(asset("c"));
  expect(uploads).toHaveLength(2);
  expect(revoked.size).toBe(1);
  expect(rejected).toEqual([]);
  expect(errors).toEqual([]);
});
