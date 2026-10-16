import { afterAll, beforeAll, expect, test } from "bun:test";
import { createServer, type ViteDevServer } from "vite";
import { WebSocket } from "ws";
import { createConnection } from "node:net";
import { isRecord, parseMessage, type Msg } from "@buzzzz/core";
import { relay } from "../server/relay";
let server: ViteDevServer;
let base: string;
const sockets: WebSocket[] = [];
function message(socket: WebSocket, type: Msg["type"]): Promise<Msg> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off("message", receive);
      reject(new Error(`Timed out waiting for ${type}`));
    }, 3000);
    function receive(data: Buffer) {
      const value = parseMessage(data.toString());
      if (value?.type === type) {
        clearTimeout(timer);
        socket.off("message", receive);
        resolve(value);
      }
    }
    socket.on("message", receive);
  });
}
function connect(role: string) {
  const socket = new WebSocket(`${base.replace("http:", "ws:")}/relay?role=${role}`);
  sockets.push(socket);
  return socket;
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
  sockets.forEach((socket) => socket.terminate());
  await server.close();
});
test("relays studio commands, phone events and disconnect counts", async () => {
  const studio = connect("studio");
  await message(studio, "peers");
  const joined = message(studio, "peers");
  const phone = connect("phone");
  expect(await joined).toEqual({ type: "peers", phones: 1 });
  await new Promise<void>((resolve) => {
    if (phone.readyState === WebSocket.OPEN) resolve();
    else phone.once("open", resolve);
  });
  const stopped = message(phone, "stop");
  studio.send(JSON.stringify({ type: "stop" }));
  expect(await stopped).toEqual({ type: "stop" });
  const fired = message(studio, "fired");
  phone.send(JSON.stringify({ type: "fired", name: "tap" }));
  expect(await fired).toEqual({ type: "fired", name: "tap" });
  const count = message(studio, "peers");
  phone.close();
  expect(await count).toEqual({ type: "peers", phones: 0 });
});
test("ignores malformed payloads and commands sent by a phone", async () => {
  const studio = connect("studio");
  await message(studio, "peers");
  const phone = connect("phone");
  await message(phone, "peers");
  const received: string[] = [];
  const record = (data: Buffer) => received.push(data.toString());
  studio.on("message", record);
  phone.send("{");
  phone.send('{"type":"stop"}');
  phone.send('{"type":"peers","phones":999}');
  const hello = message(studio, "hello");
  phone.send('{"type":"hello","device":"test"}');
  await hello;
  expect(received).toEqual(['{"type":"hello","device":"test"}']);
  studio.off("message", record);
});
test("relays saved-pattern manifests, requests and full patterns with role checks", async () => {
  const studio = connect("studio");
  await message(studio, "peers");
  const phone = connect("phone");
  await message(phone, "peers");
  const manifest: Msg = {
    type: "library-manifest",
    presets: [{ resourceId: "saved-pattern", name: "Tap" }],
  };
  const full: Msg = {
    type: "haptic-preset",
    resourceId: "saved-pattern",
    name: "Tap",
    version: "ab".repeat(32),
    pattern: {
      discretePattern: [{ time: 25, amplitude: 1, frequency: 0.5 }],
      continuousPattern: { amplitude: [], frequency: [] },
    },
  };
  const received = message(phone, "library-manifest");
  studio.send(JSON.stringify(manifest));
  expect(await received).toEqual(manifest);
  const requested = message(studio, "library-manifest-request");
  phone.send(JSON.stringify({ type: "library-manifest-request" }));
  expect(await requested).toEqual({ type: "library-manifest-request" });
  const played = message(phone, "haptic-preset");
  studio.send(JSON.stringify(full));
  expect(await played).toEqual(full);
  const rejected: string[] = [];
  const record = (data: Buffer) => rejected.push(data.toString());
  studio.on("message", record);
  phone.send(JSON.stringify(manifest));
  phone.send(JSON.stringify(full));
  const barrier = message(studio, "hello");
  phone.send(JSON.stringify({ type: "hello", device: "Role check" }));
  await barrier;
  expect(rejected).toEqual(['{"type":"hello","device":"Role check"}']);
  studio.off("message", record);
});
async function requestUpgrade(host: string, origin: string) {
  const url = new URL(base);
  return new Promise<string>((resolve, reject) => {
    const socket = createConnection({ host: url.hostname, port: Number(url.port) });
    socket.on("error", reject);
    socket.on("connect", () =>
      socket.write(
        `GET /relay?role=studio HTTP/1.1\r\nHost: ${host}\r\nOrigin: ${origin}\r\nConnection: Upgrade\r\nUpgrade: websocket\r\nSec-WebSocket-Version: 13\r\nSec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\n\r\n`,
      ),
    );
    socket.once("data", (data) => {
      resolve(data.toString());
      socket.destroy();
    });
  });
}
test("rejects a browser from another origin", async () => {
  expect(await requestUpgrade(new URL(base).host, "https://untrusted.test")).toContain(
    "403 Forbidden",
  );
});
test("rejects DNS rebinding even when origin matches a spoofed host", async () => {
  expect(await requestUpgrade("evil.test:5173", "http://evil.test:5173")).toContain(
    "403 Forbidden",
  );
});
test("bounds uploads and serves valid Rive files", async () => {
  const invalid = await fetch(base + "/riv", { method: "POST", body: "not-rive" });
  expect(invalid.status).toBe(400);
  const forbidden = await fetch(base + "/riv", {
    method: "POST",
    headers: { Origin: "https://untrusted.test" },
    body: "RIVEdata",
  });
  expect(forbidden.status).toBe(403);
  const tooLarge = await fetch(base + "/riv", {
    method: "POST",
    body: new Uint8Array(20 * 1024 * 1024 + 1),
  });
  expect(tooLarge.status).toBe(413);
  const uploaded = await fetch(base + "/riv", { method: "POST", body: "RIVEdata" });
  const data: unknown = await uploaded.json();
  if (!isRecord(data) || typeof data.path !== "string") throw new Error("Invalid upload response");
  const file = await fetch(base + data.path);
  expect(await file.text()).toBe("RIVEdata");
  expect((await fetch(base + "/riv/missing.riv")).status).toBe(404);
  expect((await fetch(base + "/lan")).status).toBe(200);
});
