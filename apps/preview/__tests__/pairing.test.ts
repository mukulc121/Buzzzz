import { expect, test } from "bun:test";
import { phoneRelayUrl, resolvePhoneConnection } from "../src/features/connection/pairing";
import { reconnectDelay, socketFailure } from "../src/features/connection/socketFailure";

const room = "b".repeat(32);
const token = "a".repeat(43);

function pairLink(server: string) {
  const link = new URL("rivehaptics://pair");
  link.searchParams.set("server", server);
  link.searchParams.set("room", room);
  link.searchParams.set("code", "123456");
  return link.href;
}

test("direct relay and local deep links preserve connection params and show only the host", async () => {
  const url = "ws://192.168.1.2:5173/relay?room=local";
  const direct = await resolvePhoneConnection({ input: url, device: "test" });
  expect(direct).toEqual({ url, label: "192.168.1.2:5173" });
  const link = new URL("rivehaptics://connect");
  link.searchParams.set("url", url);
  expect(await resolvePhoneConnection({ input: link.href, device: "test" })).toEqual(direct);
  await expect(
    resolvePhoneConnection({ input: "https://example.com/relay", device: "test" }),
  ).rejects.toThrow("pairing link");
});

test("hosted pairing posts code/device and uses the returned authenticated relay once", async () => {
  const expiresAt = Date.now() + 60000;
  let body: unknown;
  let host = "";
  const server = Bun.serve({
    port: 0,
    hostname: "127.0.0.1",
    async fetch(request) {
      expect(new URL(request.url).pathname).toBe(`/v1/rooms/${room}/pair`);
      expect(request.method).toBe("POST");
      body = await request.json();
      return Response.json({
        phoneToken: token,
        expiresAt,
        relayUrl: `ws://${host}/relay?room=${room}&token=${token}`,
      });
    },
  });
  try {
    host = `127.0.0.1:${server.port}`;
    const result = await resolvePhoneConnection({
      input: pairLink(server.url.origin),
      device: "android test",
    });
    expect(body).toEqual({ code: "123456", device: "android test" });
    const url = new URL(result.url);
    expect(url.searchParams.getAll("token")).toEqual([token]);
    expect(url.searchParams.getAll("room")).toEqual([room]);
    expect(result.label).toBe(`127.0.0.1:${server.port}`);
    expect(result.expiresAt).toBe(expiresAt);
  } finally {
    await server.stop(true);
  }
});

test("pairing rejects expired codes, cross-origin relays and mismatched credentials", async () => {
  let result: "expired" | "origin" | "token" | "time" = "expired";
  let relayHost = "";
  const server = Bun.serve({
    port: 0,
    hostname: "127.0.0.1",
    fetch() {
      if (result === "expired") return new Response(null, { status: 401 });
      const host = result === "origin" ? "example.com" : relayHost;
      return Response.json({
        phoneToken: token,
        expiresAt: result === "time" ? 0 : Date.now() + 60000,
        relayUrl: `ws://${host}/relay?room=${room}&token=${result === "token" ? "c".repeat(43) : token}`,
      });
    },
  });
  try {
    relayHost = `127.0.0.1:${server.port}`;
    const props = { input: pairLink(server.url.origin), device: "test" };
    await expect(resolvePhoneConnection(props)).rejects.toThrow("expired");
    result = "origin";
    await expect(resolvePhoneConnection(props)).rejects.toThrow("invalid relay");
    result = "token";
    await expect(resolvePhoneConnection(props)).rejects.toThrow("invalid relay");
    result = "time";
    await expect(resolvePhoneConnection(props)).rejects.toThrow("invalid pairing response");
  } finally {
    await server.stop(true);
  }
});

test("cancelled pairing aborts the request", async () => {
  const server = Bun.serve({ port: 0, hostname: "127.0.0.1", fetch: () => Response.json({}) });
  const controller = new AbortController();
  controller.abort();
  try {
    await expect(
      resolvePhoneConnection({
        input: pairLink(server.url.origin),
        device: "test",
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ name: "AbortError" });
  } finally {
    await server.stop(true);
  }
});

test("phone WebSocket URLs distinguish local roles from authenticated hosted sessions", () => {
  expect(phoneRelayUrl("ws://192.168.1.2:5173/relay").href).toBe(
    "ws://192.168.1.2:5173/relay?role=phone",
  );
  const hosted = phoneRelayUrl(`wss://relay.example/relay?room=${room}&token=${token}`);
  expect(hosted.searchParams.has("role")).toBe(false);
  expect(hosted.searchParams.getAll("room")).toEqual([room]);
  expect(hosted.searchParams.getAll("token")).toEqual([token]);
  expect(phoneRelayUrl(`${hosted.href}&role=phone`).href).toBe(hosted.href);
});

test("socket closure separates access revocation, protocol rejection, throttling and recoverable drops", () => {
  expect(socketFailure({ code: 4401, opened: true })).toContain("access ended");
  expect(socketFailure({ code: 1008, opened: true })).toContain("rejected");
  expect(socketFailure({ code: 4429, opened: true })).toContain("Too many");
  expect(socketFailure({ code: 1006, opened: false })).toContain("Couldn’t reach");
  expect(socketFailure({ code: 1006, opened: true })).toBeNull();
});

test("recoverable socket retries back off without losing a previously opened session", () => {
  expect([0, 1, 2, 3, 4, 5, 6, 100].map(reconnectDelay)).toEqual([
    1500, 3000, 6000, 12000, 24000, 30000, 30000, 30000,
  ]);
  for (let attempt = 0; attempt < 8; attempt++)
    expect(socketFailure({ code: 1006, opened: true })).toBeNull();
  expect(socketFailure({ code: 4401, opened: true })).toContain("access ended");
  expect(socketFailure({ code: 1008, opened: true })).toContain("rejected");
});
