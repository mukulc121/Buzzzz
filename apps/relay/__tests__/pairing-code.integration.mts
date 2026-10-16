import { test } from "node:test";
import assert from "node:assert/strict";
import { setTimeout } from "node:timers/promises";
import { createHash } from "node:crypto";
import { auth, connect, createRoom, jsonRecord, pairPhone, runtime } from "./harness.ts";

type Runtime = Awaited<ReturnType<typeof runtime>>;

function codeHash(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

function pair(mf: Runtime, code: string, ip = "203.0.113.1") {
  return mf.dispatchFetch("https://relay.example/v1/pair", {
    method: "POST",
    headers: { "CF-Connecting-IP": ip, "Content-Type": "application/json" },
    body: JSON.stringify({ code, device: "Numeric-code phone" }),
  });
}

test("bare code pairing issues credentials for exactly its room and remains single use", async () => {
  const mf = await runtime();
  try {
    const first = await createRoom(mf);
    const second = await createRoom(mf);
    assert.notEqual(first.pairing.code, second.pairing.code);
    const response = await pair(mf, first.pairing.code);
    assert.equal(response.status, 201);
    const phone = await jsonRecord(response);
    assert.equal(phone.roomId, first.roomId);
    assert.equal(new URL(String(phone.relayUrl)).searchParams.get("room"), first.roomId);
    const socket = await connect(mf, String(phone.relayUrl));
    assert.equal((await socket.next("session")).role, "phone");
    socket.socket.close();
    const leaked = await mf.dispatchFetch(
      String(phone.relayUrl).replace(first.roomId, second.roomId).replace(/^ws/, "http"),
      { headers: { Upgrade: "websocket" } },
    );
    assert.equal(leaked.status, 401);
    const repeated = await pair(mf, first.pairing.code);
    assert.equal(repeated.status, 401);
    assert.deepEqual(await jsonRecord(repeated), { error: "Pairing code expired or invalid" });
    await pairPhone(mf, second);
  } finally {
    await mf.dispose();
  }
});

test("bare and full-link simultaneous claims share the same one-use room state", async () => {
  const mf = await runtime();
  try {
    const room = await createRoom(mf);
    const responses = await Promise.all([
      pair(mf, room.pairing.code),
      mf.dispatchFetch(`https://relay.example/v1/rooms/${room.roomId}/pair`, {
        method: "POST",
        body: JSON.stringify({ code: room.pairing.code, device: "Full-link phone" }),
      }),
    ]);
    assert.deepEqual(responses.map((response) => response.status).sort(), [201, 401]);
  } finally {
    await mf.dispose();
  }
});

test("rotation and revocation invalidate numeric lookup without exposing its room", async () => {
  const mf = await runtime();
  try {
    const room = await createRoom(mf);
    const base = `https://relay.example/v1/rooms/${room.roomId}`;
    const rotated = await jsonRecord(
      await mf.dispatchFetch(`${base}/pairing`, { method: "POST", headers: auth(room.hostToken) }),
    );
    assert.notEqual(rotated.code, room.pairing.code);
    const old = await pair(mf, room.pairing.code);
    assert.equal(old.status, 401);
    assert.deepEqual(await jsonRecord(old), { error: "Pairing code expired or invalid" });
    const storage = await mf.unsafeGetDurableObjectStorage("", "RelayRoom", { name: room.roomId });
    assert.deepEqual(await storage.exec("SELECT pair_attempts FROM room"), [{ pair_attempts: 0 }]);
    assert.equal((await pair(mf, String(rotated.code))).status, 201);
    const newest = await jsonRecord(
      await mf.dispatchFetch(`${base}/pairing`, { method: "POST", headers: auth(room.hostToken) }),
    );
    assert.equal(
      (await mf.dispatchFetch(base, { method: "DELETE", headers: auth(room.hostToken) })).status,
      200,
    );
    const revoked = await pair(mf, String(newest.code));
    assert.equal(revoked.status, 401);
    assert.deepEqual(await jsonRecord(revoked), { error: "Pairing code expired or invalid" });
  } finally {
    await mf.dispose();
  }
});

test("unknown and expired code lookups reveal no room and allocate no application tables", async () => {
  const mf = await runtime({ PAIR_TTL_SECONDS: "1" });
  try {
    const unknown = "000000";
    const response = await pair(mf, unknown);
    assert.equal(response.status, 401);
    assert.deepEqual(await jsonRecord(response), { error: "Pairing code expired or invalid" });
    const storage = await mf.unsafeGetDurableObjectStorage("", "PairingCode", {
      name: codeHash(unknown),
    });
    assert.deepEqual(
      await storage.exec(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'reservation'",
      ),
      [],
    );
    const room = await createRoom(mf);
    await setTimeout(1100);
    const expired = await pair(mf, room.pairing.code);
    assert.equal(expired.status, 401);
    assert.deepEqual(await jsonRecord(expired), { error: "Pairing code expired or invalid" });
  } finally {
    await mf.dispose();
  }
});

test("numeric guesses are limited across codes before accessing any room", async () => {
  const mf = await runtime();
  try {
    for (let index = 0; index < 10; index += 1)
      assert.equal((await pair(mf, String(index).padStart(6, "0"))).status, 401);
    assert.equal((await pair(mf, "999999")).status, 429);
    const room = await createRoom(mf);
    assert.equal((await pair(mf, room.pairing.code, "203.0.113.2")).status, 201);
    assert.equal(
      (
        await mf.dispatchFetch(`https://relay.example/v1/rooms/${room.roomId}/project`, {
          headers: auth(room.hostToken),
        })
      ).status,
      200,
    );
  } finally {
    await mf.dispose();
  }
});

test("a code reservation rejects collisions and an old alarm preserves its newer owner", async () => {
  const mf = await runtime();
  try {
    const env = await mf.getBindings<Env>();
    const hash = codeHash("012345");
    const code = env.PAIRING_CODES.getByName(hash);
    const attempts = await Promise.all([
      code.reserve("a".repeat(32), Date.now() + 60_000),
      code.reserve("b".repeat(32), Date.now() + 60_000),
    ]);
    assert.deepEqual(attempts.sort(), [false, true]);
    const owner = await code.lookup();
    assert.ok(owner === "a".repeat(32) || owner === "b".repeat(32));
    const storage = await mf.unsafeGetDurableObjectStorage("", "PairingCode", { name: hash });
    await storage.exec("UPDATE reservation SET expires = 0");
    assert.equal(await code.reserve("c".repeat(32), Date.now() + 60_000), true);
    assert.equal(await code.lookup(), "c".repeat(32));
    const alarmHash = codeHash("012346");
    const alarmCode = env.PAIRING_CODES.getByName(alarmHash);
    assert.equal(await alarmCode.reserve("a".repeat(32), Date.now() + 250), true);
    const alarmStorage = await mf.unsafeGetDurableObjectStorage("", "PairingCode", {
      name: alarmHash,
    });
    await alarmStorage.exec(
      "UPDATE reservation SET room_id = ?, expires = ?",
      "c".repeat(32),
      Date.now() + 60_000,
    );
    await setTimeout(400);
    assert.equal(await alarmCode.lookup(), "c".repeat(32));
  } finally {
    await mf.dispose();
  }
});
