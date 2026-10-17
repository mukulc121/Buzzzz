import { after as afterAll, before as beforeAll, describe, test } from "node:test";
import assert from "node:assert/strict";
import { setTimeout } from "node:timers/promises";
import type { Miniflare } from "miniflare";
import { WebSocket as NativeWebSocket } from "ws";
import { once } from "node:events";
import { request as httpRequest } from "node:http";
import {
  auth,
  connect,
  createRoom,
  jsonRecord,
  pairPhone,
  runtime,
  stringFields,
} from "./harness.ts";

let mf: Miniflare;
beforeAll(async () => {
  mf = await runtime();
});
afterAll(async () => {
  await mf?.dispose();
});

describe("private relay rooms", () => {
  test("requires an allowed browser origin to create a room", async () => {
    for (const headers of [{}, { Origin: "https://attacker.example" }]) {
      const response = await mf.dispatchFetch("https://relay.example/v1/rooms", {
        method: "POST",
        headers,
      });
      assert.equal(response.status, 403);
    }
    const room = await createRoom(mf);
    assert.match(room.pairing.code, /^\d{6}$/);
    assert.deepEqual(new URL(room.relayUrl).searchParams.get("token"), room.hostToken);
  });

  test("claims each pairing code once, including concurrent claims", async () => {
    const room = await createRoom(mf);
    const results = await Promise.all(
      Array.from({ length: 2 }, () =>
        mf.dispatchFetch(`https://relay.example/v1/rooms/${room.roomId}/pair`, {
          method: "POST",
          body: JSON.stringify({ code: room.pairing.code, device: "Phone" }),
        }),
      ),
    );
    assert.deepEqual(results.map((result) => result.status).sort(), [201, 401]);
  });

  test("isolates room credentials and rejects phone administrative access", async () => {
    const first = await createRoom(mf);
    const second = await createRoom(mf);
    const phone = await pairPhone(mf, first);
    for (const [room, token, status] of [
      [second.roomId, first.hostToken, 401],
      [first.roomId, phone.phoneToken, 403],
    ]) {
      const response = await mf.dispatchFetch(`https://relay.example/v1/rooms/${room}/pairing`, {
        method: "POST",
        headers: auth(String(token)),
      });
      assert.deepEqual(response.status, Number(status));
    }
    const rejected = await mf.dispatchFetch(`${first.relayUrl.replace(/^ws/, "http")}&role=phone`, {
      headers: { ...auth(first.hostToken), Upgrade: "websocket" },
    });
    assert.equal(rejected.status, 400);
    const leaked = await mf.dispatchFetch(
      phone.relayUrl.replace(first.roomId, second.roomId).replace(/^ws/, "http"),
      { headers: { Upgrade: "websocket" } },
    );
    assert.equal(leaked.status, 401);
  });

  test("routes commands and events only between the room's opposite roles", async () => {
    const room = await createRoom(mf);
    const phone = await pairPhone(mf, room);
    const hostSocket = await connect(mf, room.relayUrl, true);
    const phoneSocket = await connect(mf, phone.relayUrl);
    assert.equal((await phoneSocket.next("session")).role, "phone");
    hostSocket.socket.send(JSON.stringify({ type: "stop" }));
    assert.deepEqual(await phoneSocket.next("stop"), { type: "stop" });
    phoneSocket.socket.send(JSON.stringify({ type: "fired", name: "tap" }));
    assert.deepEqual(await hostSocket.next("fired"), { type: "fired", name: "tap" });
    const closed = new Promise<number>((resolve) =>
      phoneSocket.socket.addEventListener("close", (event) => resolve(event.code), { once: true }),
    );
    phoneSocket.socket.send(
      JSON.stringify({
        type: "play",
        pattern: { discretePattern: [], continuousPattern: { amplitude: [], frequency: [] } },
      }),
    );
    assert.deepEqual(await closed, 1008);
    hostSocket.socket.close();
  });

  test("keeps saved-pattern delivery inside its room and enforces library message roles", async () => {
    const first = await createRoom(mf);
    const second = await createRoom(mf);
    const firstPhone = await pairPhone(mf, first);
    const secondPhone = await pairPhone(mf, second);
    const host = await connect(mf, first.relayUrl, true);
    const phone = await connect(mf, firstPhone.relayUrl);
    const otherHost = await connect(mf, second.relayUrl, true);
    const otherPhone = await connect(mf, secondPhone.relayUrl);
    const manifest = {
      type: "library-manifest",
      presets: [{ resourceId: "saved-pattern", name: "Tap" }],
    };
    const full = {
      type: "haptic-preset",
      resourceId: "saved-pattern",
      name: "Tap",
      version: "ab".repeat(32),
      pattern: {
        discretePattern: [{ time: 25, amplitude: 1, frequency: 0.5 }],
        continuousPattern: { amplitude: [], frequency: [] },
      },
    };
    host.socket.send(JSON.stringify(manifest));
    assert.deepEqual(await phone.next("library-manifest"), manifest);
    phone.socket.send(JSON.stringify({ type: "library-manifest-request" }));
    assert.deepEqual(await host.next("library-manifest-request"), {
      type: "library-manifest-request",
    });
    host.socket.send(JSON.stringify(full));
    assert.deepEqual(await phone.next("haptic-preset"), full);
    const reconnected = await connect(mf, firstPhone.relayUrl);
    await reconnected.next("session");
    await reconnected.next("peers");
    assert.equal(
      reconnected.messages.some((message) => message.type === "haptic-preset"),
      false,
    );
    otherHost.socket.send(JSON.stringify({ type: "stop" }));
    await otherPhone.next("stop");
    for (const receiver of [otherHost, otherPhone])
      assert.equal(
        receiver.messages.some((message) =>
          ["library-manifest", "library-manifest-request", "haptic-preset"].includes(
            String(message.type),
          ),
        ),
        false,
      );
    const phoneClosed = new Promise<number>((resolve) =>
      phone.socket.addEventListener("close", (event) => resolve(event.code), { once: true }),
    );
    phone.socket.send(JSON.stringify(full));
    assert.equal(await phoneClosed, 1008);
    const hostClosed = new Promise<number>((resolve) =>
      host.socket.addEventListener("close", (event) => resolve(event.code), { once: true }),
    );
    host.socket.send(JSON.stringify({ type: "library-manifest-request" }));
    assert.equal(await hostClosed, 1008);
    reconnected.socket.close();
    otherHost.socket.close();
    otherPhone.socket.close();
  });

  test("stores bounded private assets and revokes read access", async () => {
    const room = await createRoom(mf);
    const response = await mf.dispatchFetch(
      `https://relay.example/v1/rooms/${room.roomId}/assets?kind=rive`,
      {
        method: "POST",
        headers: {
          ...auth(room.hostToken),
          "Content-Type": "application/octet-stream",
          "Content-Length": "8",
        },
        body: "RIVEtest",
      },
    );
    assert.equal(response.status, 201);
    const asset = await stringFields(response, ["assetId", "path", "url"]);
    assert.equal(asset.path, asset.url);
    assert.equal((await mf.dispatchFetch(asset.url.split("?")[0]!)).status, 404);
    assert.equal(await (await mf.dispatchFetch(asset.url)).text(), "RIVEtest");
    const range = await mf.dispatchFetch(asset.url, { headers: { Range: "bytes=1-3" } });
    assert.equal(range.status, 206);
    assert.equal(await range.text(), "IVE");
    const removed = await mf.dispatchFetch(
      `https://relay.example/v1/rooms/${room.roomId}/assets/${asset.assetId}`,
      { method: "DELETE", headers: auth(room.hostToken) },
    );
    assert.equal(removed.status, 200);
    assert.equal((await mf.dispatchFetch(asset.url)).status, 404);
  });

  test("shares a validated snapshot without giving administrative access", async () => {
    const room = await createRoom(mf);
    const project = {
      presets: [
        {
          id: "tap",
          name: "Tap",
          pattern: { discretePattern: [], continuousPattern: { amplitude: [], frequency: [] } },
        },
      ],
      map: {},
    };
    const response = await mf.dispatchFetch(
      `https://relay.example/v1/rooms/${room.roomId}/shares`,
      {
        method: "POST",
        headers: auth(room.hostToken),
        body: JSON.stringify({ project, projectId: "project-a" }),
      },
    );
    assert.equal(response.status, 201);
    const share = await stringFields(response, ["shareId", "token", "url"]);
    assert.equal((await mf.dispatchFetch(share.url.split("?")[0]!)).status, 404);
    assert.deepEqual((await jsonRecord(await mf.dispatchFetch(share.url))).project, project);
    const admin = await mf.dispatchFetch(`https://relay.example/v1/rooms/${room.roomId}/pairing`, {
      method: "POST",
      headers: auth(share.token),
    });
    assert.equal(admin.status, 401);
    const updated = { ...project, map: { tap: "tap" } };
    const update = await mf.dispatchFetch(
      `https://relay.example/v1/rooms/${room.roomId}/shares/${share.shareId}`,
      { method: "PUT", headers: auth(room.hostToken), body: JSON.stringify({ project: updated }) },
    );
    assert.equal(update.status, 200);
    assert.deepEqual((await jsonRecord(await mf.dispatchFetch(share.url))).project, updated);
    await mf.dispatchFetch(
      `https://relay.example/v1/rooms/${room.roomId}/shares/${share.shareId}`,
      { method: "DELETE", headers: auth(room.hostToken) },
    );
    assert.equal((await mf.dispatchFetch(share.url)).status, 404);
  });

  test("revokes phone sessions and closes the room", async () => {
    const room = await createRoom(mf);
    const phone = await pairPhone(mf, room);
    await mf.dispatchFetch(`https://relay.example/v1/rooms/${room.roomId}/phones`, {
      method: "DELETE",
      headers: auth(room.hostToken),
    });
    assert.equal(
      (
        await mf.dispatchFetch(phone.relayUrl.replace(/^ws/, "http"), {
          headers: { Upgrade: "websocket" },
        })
      ).status,
      401,
    );
    await mf.dispatchFetch(`https://relay.example/v1/rooms/${room.roomId}`, {
      method: "DELETE",
      headers: auth(room.hostToken),
    });
    assert.equal(
      (
        await mf.dispatchFetch(`https://relay.example/v1/rooms/${room.roomId}/pairing`, {
          method: "POST",
          headers: auth(room.hostToken),
        })
      ).status,
      410,
    );
  });

  test("rejects oversized uploads and reserves room storage before concurrent writes", async () => {
    const room = await createRoom(mf);
    const url = `https://relay.example/v1/rooms/${room.roomId}/assets?kind=rive`;
    const oversizedUrl = new URL(
      new URL(url).pathname + new URL(url).search,
      (await mf.ready).href,
    );
    const tooLarge = await new Promise<number>((resolve, reject) => {
      const upload = httpRequest(
        oversizedUrl.href,
        {
          method: "POST",
          headers: { ...auth(room.hostToken), "Content-Length": String(20 * 1024 * 1024 + 1) },
        },
        (response) => {
          response.on("error", reject);
          response.resume();
          response.on("end", () => {
            resolve(response.statusCode ?? 0);
            upload.destroy();
          });
        },
      );
      upload.on("error", reject);
      upload.flushHeaders();
    });
    assert.equal(tooLarge, 413);
    const body = new Uint8Array(20 * 1024 * 1024);
    const results = await Promise.all(
      Array.from({ length: 6 }, () =>
        mf.dispatchFetch(url, {
          method: "POST",
          headers: {
            ...auth(room.hostToken),
            "Content-Type": "application/octet-stream",
            "Content-Length": String(body.length),
          },
          body,
        }),
      ),
    );
    assert.deepEqual(results.map((result) => result.status).sort(), [201, 201, 201, 201, 201, 409]);
    await mf.dispatchFetch(`https://relay.example/v1/rooms/${room.roomId}`, {
      method: "DELETE",
      headers: auth(room.hostToken),
    });
  });

  test("caps connections at32 and rejects an untrusted WebSocket origin", async () => {
    const room = await createRoom(mf);
    const denied = await mf.dispatchFetch(room.relayUrl.replace(/^ws/, "http"), {
      headers: { Upgrade: "websocket", Origin: "https://attacker.example" },
    });
    assert.equal(denied.status, 403);
    const sockets = await Promise.all(
      Array.from({ length: 32 }, () => connect(mf, room.relayUrl, true)),
    );
    const overflow = await mf.dispatchFetch(room.relayUrl.replace(/^ws/, "http"), {
      headers: { Upgrade: "websocket", Origin: "https://studio.example" },
    });
    assert.equal(overflow.status, 409);
    for (const connection of sockets) connection.socket.close();
  });

  test("accepts the native phone Origin but never gives it host access", async () => {
    const room = await createRoom(mf);
    const phone = await pairPhone(mf, room);
    const response = await mf.dispatchFetch(phone.relayUrl.replace(/^ws/, "http"), {
      headers: { Upgrade: "websocket", Origin: "https://relay.example" },
    });
    assert.equal(response.status, 101);
    response.webSocket!.accept();
    response.webSocket!.close();
    for (const [url, origin] of [
      [room.relayUrl, "https://relay.example"],
      [phone.relayUrl, "https://attacker.example"],
    ]) {
      assert.equal(
        (
          await mf.dispatchFetch(url.replace(/^ws/, "http"), {
            headers: { Upgrade: "websocket", Origin: origin },
          })
        ).status,
        403,
      );
    }
    const preflight = await mf.dispatchFetch("https://relay.example/v1/rooms", {
      method: "OPTIONS",
      headers: { Origin: "https://studio.example", "Access-Control-Request-Headers": "Range" },
    });
    assert.match(preflight.headers.get("Access-Control-Allow-Headers") ?? "", /Range/i);
  });

  test("broadcasts phone loss after an abrupt TCP disconnect", async () => {
    const room = await createRoom(mf);
    const phone = await pairPhone(mf, room);
    const host = await connect(mf, room.relayUrl, true);
    await host.next("session");
    await host.next("peers");
    const address = new URL((await mf.ready).href);
    const target = new URL(phone.relayUrl);
    address.protocol = "ws:";
    address.pathname = target.pathname;
    address.search = target.search;
    const socket = new NativeWebSocket(address.href, {
      headers: { Origin: "https://relay.example" },
    });
    await once(socket, "open", { signal: AbortSignal.timeout(2000) });
    try {
      assert.equal((await host.next("peers")).phones, 1);
      socket.terminate();
      assert.equal((await host.next("peers")).phones, 0);
    } finally {
      socket.terminate();
      host.socket.close();
    }
  });

  test("distinguishes rate rejection from revoked credentials", async () => {
    const room = await createRoom(mf);
    const phone = await pairPhone(mf, room);
    const connection = await connect(mf, phone.relayUrl);
    const closed = new Promise<number>((resolve) =>
      connection.socket.addEventListener("close", (event) => resolve(event.code), { once: true }),
    );
    for (let index = 0; index < 121; index += 1)
      connection.socket.send(JSON.stringify({ type: "hello", device: "Rate test" }));
    assert.equal(await closed, 4429);
    const renewed = await connect(mf, phone.relayUrl);
    const revoked = new Promise<number>((resolve) =>
      renewed.socket.addEventListener("close", (event) => resolve(event.code), { once: true }),
    );
    await mf.dispatchFetch(`https://relay.example/v1/rooms/${room.roomId}/phones`, {
      method: "DELETE",
      headers: auth(room.hostToken),
    });
    assert.equal(await revoked, 4401);
  });

  test("public reads cannot exhaust the host administration bucket", async () => {
    const room = await createRoom(mf);
    const statuses = await Promise.all(
      Array.from({ length: 481 }, () =>
        mf
          .dispatchFetch(`https://relay.example/v1/shares/${room.roomId}/${"a".repeat(32)}`)
          .then((response) => response.status),
      ),
    );
    assert.ok(statuses.includes(429));
    const response = await mf.dispatchFetch(
      `https://relay.example/v1/rooms/${room.roomId}/pairing`,
      { method: "POST", headers: auth(room.hostToken) },
    );
    assert.equal(response.status, 200);
  });
});

test("pairing expires independently of a live host session", async () => {
  const short = await runtime({ PAIR_TTL_SECONDS: "1" });
  try {
    const room = await createRoom(short);
    await setTimeout(1100);
    const response = await short.dispatchFetch(
      `https://relay.example/v1/rooms/${room.roomId}/pair`,
      { method: "POST", body: JSON.stringify({ code: room.pairing.code, device: "Phone" }) },
    );
    assert.equal(response.status, 401);
    const renewed = await short.dispatchFetch(
      `https://relay.example/v1/rooms/${room.roomId}/pairing`,
      { method: "POST", headers: auth(room.hostToken) },
    );
    assert.equal(renewed.status, 200);
  } finally {
    await short.dispose();
  }
});

test("room expiry closes sessions and removes R2 objects", async () => {
  const short = await runtime({ SESSION_TTL_SECONDS: "1" });
  try {
    const room = await createRoom(short);
    const upload = await short.dispatchFetch(
      `https://relay.example/v1/rooms/${room.roomId}/assets?kind=rive`,
      {
        method: "POST",
        headers: {
          ...auth(room.hostToken),
          "Content-Type": "application/octet-stream",
          "Content-Length": "4",
        },
        body: "RIVE",
      },
    );
    assert.equal(upload.status, 201);
    const asset = await stringFields(upload, ["url"]);
    await setTimeout(1300);
    assert.equal((await short.dispatchFetch(asset.url)).status, 410);
    const { ASSETS: bucket } = await short.getBindings<{ ASSETS: R2Bucket }>();
    assert.equal((await bucket.list()).objects.length, 0);
  } finally {
    await short.dispose();
  }
});
