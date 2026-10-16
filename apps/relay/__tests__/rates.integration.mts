import { test } from "node:test";
import assert from "node:assert/strict";
import { auth, connect, createRoom, jsonRecord, runtime } from "./harness.ts";

test("anonymous connection and pairing probes cannot consume authenticated room quotas", async () => {
  const mf = await runtime();
  try {
    const room = await createRoom(mf);
    const unauthorized = new URL(room.relayUrl.replace(/^ws/, "http"));
    unauthorized.searchParams.set("token", "a".repeat(43));
    for (let index = 0; index < 65; index += 1) {
      const response = await mf.dispatchFetch(unauthorized.href, {
        headers: { Upgrade: "websocket", "CF-Connecting-IP": "203.0.113.1" },
      });
      assert.equal(response.status, 401);
    }
    const host = await connect(mf, room.relayUrl, true);
    assert.equal((await host.next("session")).role, "host");
    host.socket.close();
    const pair = (code: string, ip: string) =>
      mf.dispatchFetch(`https://relay.example/v1/rooms/${room.roomId}/pair`, {
        method: "POST",
        headers: { "CF-Connecting-IP": ip },
        body: JSON.stringify({ code, device: "Test phone" }),
      });
    const wrong = room.pairing.code === "000000" ? "000001" : "000000";
    for (let index = 0; index < 10; index += 1)
      assert.equal((await pair(wrong, "203.0.113.1")).status, 401);
    assert.equal((await pair(wrong, "203.0.113.1")).status, 429);
    assert.equal((await pair(room.pairing.code, "203.0.113.2")).status, 201);
    assert.equal(
      (
        await mf.dispatchFetch(`https://relay.example/v1/rooms/${room.roomId}/pairing`, {
          method: "POST",
          headers: auth(room.hostToken),
        })
      ).status,
      200,
    );
    const storage = await mf.unsafeGetDurableObjectStorage("", "RelayRoom", { name: room.roomId });
    assert.deepEqual(await storage.exec("SELECT count FROM rates WHERE name = 'pair-valid'"), [
      { count: 1 },
    ]);
  } finally {
    await mf.dispose();
  }
});

test("parallel same-IP pairing guesses reserve their budget before verification", async () => {
  const mf = await runtime();
  try {
    const room = await createRoom(mf);
    const wrong = room.pairing.code === "000000" ? "000001" : "000000";
    const pair = (code: string, ip: string) =>
      mf.dispatchFetch(`https://relay.example/v1/rooms/${room.roomId}/pair`, {
        method: "POST",
        headers: { "CF-Connecting-IP": ip },
        body: JSON.stringify({ code, device: "Concurrent phone" }),
      });
    const statuses = await Promise.all(
      Array.from({ length: 64 }, () =>
        pair(wrong, "203.0.113.10").then((response) => response.status),
      ),
    );
    assert.equal(statuses.filter((status) => status === 401).length, 10);
    assert.equal(statuses.filter((status) => status === 429).length, 54);
    assert.equal((await pair(room.pairing.code, "203.0.113.11")).status, 201);
  } finally {
    await mf.dispose();
  }
});

test("distributed guesses exhaust only the current code and host renewal restores pairing", async () => {
  const mf = await runtime();
  try {
    const room = await createRoom(mf);
    const host = await connect(mf, room.relayUrl, true);
    const url = `https://relay.example/v1/rooms/${room.roomId}`;
    const wrong = room.pairing.code === "000000" ? "000001" : "000000";
    const pair = (code: string, ip: string) =>
      mf.dispatchFetch(`${url}/pair`, {
        method: "POST",
        headers: { "CF-Connecting-IP": ip },
        body: JSON.stringify({ code, device: "Concurrent phone" }),
      });
    const statuses = await Promise.all(
      Array.from({ length: 40 }, (_, index) =>
        pair(wrong, `203.0.113.${index + 20}`).then((response) => response.status),
      ),
    );
    assert.ok(statuses.every((status) => status === 401 || status === 429));
    assert.ok(statuses.includes(429));
    assert.equal((await pair(room.pairing.code, "203.0.113.100")).status, 429);
    const storage = await mf.unsafeGetDurableObjectStorage("", "RelayRoom", { name: room.roomId });
    assert.deepEqual(await storage.exec("SELECT pair_attempts, pair_used FROM room"), [
      { pair_attempts: 30, pair_used: 1 },
    ]);
    const renewed = await jsonRecord(
      await mf.dispatchFetch(`${url}/pairing`, { method: "POST", headers: auth(room.hostToken) }),
    );
    assert.equal(typeof renewed.code, "string");
    assert.equal((await pair(String(renewed.code), "203.0.113.20")).status, 201);
    assert.equal(
      (await mf.dispatchFetch(`${url}/project`, { headers: auth(room.hostToken) })).status,
      200,
    );
    host.socket.send(JSON.stringify({ type: "stop" }));
    assert.equal(host.socket.readyState, 1);
    host.socket.close();
  } finally {
    await mf.dispose();
  }
});
