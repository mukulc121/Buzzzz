import { afterAll, beforeAll, expect, test } from "bun:test";
import { request } from "node:http";
import { createServer, type ViteDevServer } from "vite";
import { WebSocket } from "ws";
import { isRecord, parseMessage, type Msg } from "@buzzzz/core";
import { relay } from "../server/relay.ts";

let server: ViteDevServer;
let base: string;
const sockets: WebSocket[] = [];
const body = new Uint8Array([73, 68, 51, 4, 0, 0]);

async function strings(response: Response, names: string[]): Promise<Record<string, string>> {
  const value: unknown = await response.json();
  if (!isRecord(value)) throw new Error("Expected an object");
  const result: Record<string, string> = {};
  for (const name of names) {
    if (typeof value[name] !== "string") throw new Error(`Expected ${name}`);
    result[name] = value[name];
  }
  return result;
}

async function session() {
  return strings(
    await fetch(`${base}/media/session`, { method: "POST", headers: { Origin: base } }),
    ["origin", "roomId", "hostToken"],
  );
}

function upload(target: Record<string, string>, contentType = "audio/mpeg") {
  return fetch(`${base}/v1/rooms/${target.roomId}/assets?kind=media`, {
    method: "POST",
    headers: {
      Origin: base,
      Authorization: `Bearer ${target.hostToken}`,
      "Content-Type": contentType,
    },
    body,
  });
}

function next(socket: WebSocket, type: Msg["type"]): Promise<Msg> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off("message", receive);
      reject(new Error(`No ${type}`));
    }, 3000);
    function receive(raw: Buffer) {
      const message = parseMessage(raw.toString());
      if (message?.type !== type) return;
      clearTimeout(timer);
      socket.off("message", receive);
      resolve(message);
    }
    socket.on("message", receive);
  });
}

async function connect(role: "studio" | "phone", host = new URL(base).host) {
  const socket = new WebSocket(`${base.replace("http:", "ws:")}/relay?role=${role}`, {
    headers: { Host: host },
  });
  sockets.push(socket);
  await next(socket, "peers");
  return socket;
}

function audio(downloadUrl: string): Extract<Msg, { type: "audio-haptics" }> {
  return {
    type: "audio-haptics",
    resourceId: "audio",
    name: "Fanfare",
    version: "ab".repeat(32),
    durationMs: 100,
    pattern: { discretePattern: [], continuousPattern: { amplitude: [], frequency: [] } },
    audio: { clipId: "fanfare.mp3", downloadUrl, contentType: "audio/mpeg", size: body.length },
  };
}

beforeAll(async () => {
  server = await createServer({
    configFile: false,
    root: import.meta.dir + "/..",
    plugins: [relay()],
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { host: "127.0.0.1", port: 0 },
  });
  await server.listen();
  const address = server.httpServer?.address();
  if (!address || typeof address === "string") throw new Error("Missing relay port");
  base = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  for (const socket of sockets) socket.terminate();
  await server.close();
});

test("local media namespace is stable, public discovery hides credentials and host creation is same-origin", async () => {
  const first = await session();
  expect(await session()).toEqual(first);
  expect(first.roomId).toMatch(/^[a-f0-9]{32}$/);
  expect(first.hostToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
  expect(new URL(first.origin).port).toBe(new URL(base).port);
  expect(await (await fetch(`${base}/media/session`)).json()).toEqual({ roomId: first.roomId });
  expect((await fetch(`${base}/media/session`, { method: "POST" })).status).toBe(403);
  expect(
    (
      await fetch(`${base}/media/session`, {
        method: "POST",
        headers: { Origin: "https://evil.test" },
      })
    ).status,
  ).toBe(403);
});

test("signed media preserves MIME, byte ranges and metadata while rejecting unauthorized uploads and reads", async () => {
  const target = await session();
  expect((await upload({ ...target, hostToken: "wrong" })).status).toBe(401);
  expect((await upload(target, "application/zip")).status).toBe(415);
  const response = await upload(target, "application/zip+dotlottie");
  expect(response.status).toBe(201);
  const asset = await strings(response, ["assetId", "url", "path"]);
  const url = new URL(asset.url);
  expect(url.origin).toBe(target.origin);
  expect(asset.path).toBe(asset.url);
  const local = `${base}${url.pathname}${url.search}`;
  const read = await fetch(local);
  expect(read.headers.get("content-type")).toBe("application/zip+dotlottie");
  expect(new Uint8Array(await read.arrayBuffer())).toEqual(body);
  const ranged = await fetch(local, { headers: { Range: "bytes=1-3" } });
  expect(ranged.status).toBe(206);
  expect(ranged.headers.get("content-range")).toBe(`bytes 1-3/${body.length}`);
  expect(new Uint8Array(await ranged.arrayBuffer())).toEqual(body.slice(1, 4));
  expect((await fetch(local, { method: "HEAD" })).headers.get("content-length")).toBe(
    String(body.length),
  );
  expect((await fetch(local, { headers: { Range: "bytes=99-" } })).status).toBe(416);
  expect((await fetch(local.replace(url.search, `?token=${"x".repeat(43)}`))).status).toBe(404);
  expect((await fetch(local.replace(target.roomId, "f".repeat(32)))).status).toBe(404);
});

test("media relay validates stored bytes/type/token and uses each recipient's paired origin", async () => {
  const target = await session();
  const asset = await strings(await upload(target), ["url"]);
  const studio = await connect("studio");
  const localPhone = await connect("phone");
  const lanOrigin = `http://192.168.1.24:${new URL(base).port}`;
  const lanPhone = await connect("phone", new URL(lanOrigin).host);
  const localReceived = next(localPhone, "audio-haptics");
  const lanReceived = next(lanPhone, "audio-haptics");
  const message = audio(asset.url);
  studio.send(JSON.stringify(message));
  const localMessage = await localReceived;
  const lanMessage = await lanReceived;
  const signed = new URL(asset.url);
  expect(localMessage).toEqual(audio(`${base}${signed.pathname}${signed.search}`));
  expect(lanMessage).toEqual(audio(`${lanOrigin}${signed.pathname}${signed.search}`));
  const seen: Msg[] = [];
  localPhone.on("message", (raw: Buffer) => {
    const parsed = parseMessage(raw.toString());
    if (parsed) seen.push(parsed);
  });
  for (const clip of [
    { ...message.audio, size: body.length + 1 },
    { ...message.audio, contentType: "audio/wav" },
    { ...message.audio, downloadUrl: asset.url.replace(target.roomId, "f".repeat(32)) },
    { ...message.audio, downloadUrl: asset.url.replace(/token=.*/, `token=${"x".repeat(43)}`) },
  ])
    studio.send(JSON.stringify({ ...message, audio: clip }));
  localPhone.send(JSON.stringify(message));
  const hostEvents: Msg[] = [];
  studio.on("message", (raw: Buffer) => {
    const parsed = parseMessage(raw.toString());
    if (parsed) hostEvents.push(parsed);
  });
  const phoneBarrier = next(studio, "hello");
  localPhone.send(JSON.stringify({ type: "hello", device: "Role check" }));
  await phoneBarrier;
  expect(hostEvents.filter((entry) => entry.type === "audio-haptics")).toEqual([]);
  const barrier = next(localPhone, "stop");
  studio.send(JSON.stringify({ type: "stop" }));
  await barrier;
  expect(seen.filter((entry) => entry.type === "audio-haptics")).toEqual([]);
});

test("uploads enforce declared file size and the ten-asset session limit", async () => {
  const target = await session();
  const status = await new Promise<number>((resolve, reject) => {
    const req = request(
      `${base}/v1/rooms/${target.roomId}/assets?kind=media`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${target.hostToken}`,
          Origin: base,
          "Content-Type": "audio/mpeg",
          "Content-Length": String(20 * 1024 * 1024 + 1),
        },
      },
      (res) => {
        res.resume();
        resolve(res.statusCode ?? 0);
      },
    );
    req.on("error", reject);
    req.end();
  });
  expect(status).toBe(413);
  let response: Response;
  let added = 0;
  do {
    response = await upload(target);
    if (response.status === 201) added += 1;
  } while (response.status === 201 && added < 11);
  expect(response.status).toBe(409);
  expect(added).toBe(8);
});

test("concurrent uploads reserve the 100 MiB quota and each server has a separate namespace", async () => {
  const isolated = await createServer({
    configFile: false,
    root: import.meta.dir + "/..",
    plugins: [relay()],
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { host: "127.0.0.1", port: 0 },
  });
  try {
    await isolated.listen();
    const address = isolated.httpServer?.address();
    if (!address || typeof address === "string") throw new Error("Missing relay port");
    const origin = `http://127.0.0.1:${address.port}`;
    const target = await strings(
      await fetch(`${origin}/media/session`, { method: "POST", headers: { Origin: origin } }),
      ["roomId", "hostToken"],
    );
    expect(target.roomId).not.toBe((await session()).roomId);
    const file = new Uint8Array(20 * 1024 * 1024);
    const results = await Promise.all(
      Array.from({ length: 6 }, () =>
        fetch(`${origin}/v1/rooms/${target.roomId}/assets?kind=media`, {
          method: "POST",
          headers: {
            Origin: origin,
            Authorization: `Bearer ${target.hostToken}`,
            "Content-Type": "audio/mpeg",
          },
          body: file,
        }),
      ),
    );
    expect(results.filter((response) => response.status === 201)).toHaveLength(5);
    expect(results.filter((response) => response.status === 409)).toHaveLength(1);
    for (const response of results) await response.arrayBuffer();
  } finally {
    await isolated.close();
  }
}, 20_000);
