import { test } from "node:test";
import assert from "node:assert/strict";
import type { Miniflare } from "miniflare";
import { auth, connect, createRoom, pairPhone, runtime, stringFields } from "./harness.ts";

async function upload(mf: Miniflare, room: Awaited<ReturnType<typeof createRoom>>) {
  const response = await mf.dispatchFetch(
    `https://relay.example/v1/rooms/${room.roomId}/assets?kind=rive`,
    {
      method: "POST",
      headers: {
        ...auth(room.hostToken),
        "Content-Type": "application/octet-stream",
        "Content-Length": "4",
      },
      body: new Uint8Array([82, 73, 86, 69]),
    },
  );
  assert.equal(response.status, 201);
  return stringFields(response, ["assetId", "url"]);
}

test("revoking a published Rive asset does not replay its dead URL on phone reconnect", async () => {
  const mf = await runtime();
  const clients: Awaited<ReturnType<typeof connect>>[] = [];
  try {
    const room = await createRoom(mf);
    const session = await pairPhone(mf, room);
    const host = await connect(mf, room.relayUrl, true);
    const phone = await connect(mf, session.relayUrl);
    clients.push(host, phone);
    await host.next("session");
    await phone.next("session");
    const asset = await upload(mf, room);
    const load = { type: "load", riv: asset.url, map: {} };
    host.socket.send(JSON.stringify(load));
    assert.deepEqual(await phone.next("load"), load);
    const revoked = await mf.dispatchFetch(
      `https://relay.example/v1/rooms/${room.roomId}/assets/${asset.assetId}`,
      { method: "DELETE", headers: auth(room.hostToken) },
    );
    assert.equal(revoked.status, 200);
    assert.equal((await mf.dispatchFetch(asset.url)).status, 404);
    phone.socket.close();
    const cold = await connect(mf, session.relayUrl);
    clients.push(cold);
    await cold.next("session");
    await cold.next("peers");
    assert.equal(
      cold.messages.some((message) => message.type === "load"),
      false,
    );
    const storage = await mf.unsafeGetDurableObjectStorage("", "RelayRoom", { name: room.roomId });
    assert.deepEqual(await storage.exec("SELECT value FROM state WHERE name = 'load'"), []);
  } finally {
    for (const client of clients) {
      try {
        client.socket.close();
      } catch {}
    }
    await mf.dispose();
  }
});

test("deleting an older Rive asset preserves the newer authenticated load, map, project and media", async () => {
  const mf = await runtime();
  const clients: Awaited<ReturnType<typeof connect>>[] = [];
  try {
    const room = await createRoom(mf);
    const session = await pairPhone(mf, room);
    const host = await connect(mf, room.relayUrl, true);
    const phone = await connect(mf, session.relayUrl);
    clients.push(host, phone);
    await host.next("session");
    await phone.next("session");
    const first = await upload(mf, room);
    const second = await upload(mf, room);
    for (const asset of [first, second]) {
      const load = { type: "load", riv: asset.url, map: {} };
      host.socket.send(JSON.stringify(load));
      assert.deepEqual(await phone.next("load"), load);
    }
    const pattern = { discretePattern: [], continuousPattern: { amplitude: [], frequency: [] } };
    const map = { type: "map", map: { tap: pattern } };
    host.socket.send(JSON.stringify(map));
    assert.deepEqual(await phone.next("map"), map);
    const project = { presets: [{ id: "tap", name: "Tap", pattern }], map: {} };
    const base = `https://relay.example/v1/rooms/${room.roomId}`;
    const headers = auth(room.hostToken);
    assert.equal(
      (
        await mf.dispatchFetch(`${base}/project`, {
          method: "PUT",
          headers,
          body: JSON.stringify({ project, projectId: "project-a", baseRevision: 0 }),
        })
      ).status,
      200,
    );
    const storage = await mf.unsafeGetDurableObjectStorage("", "RelayRoom", { name: room.roomId });
    const savedProject = await storage.exec("SELECT * FROM project");
    const mediaResponse = await mf.dispatchFetch(`${base}/assets?kind=media`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "audio/mpeg", "Content-Length": "4" },
      body: new Uint8Array([73, 68, 51, 4]),
    });
    assert.equal(mediaResponse.status, 201);
    const media = await stringFields(mediaResponse, ["url"]);
    const rejected = await connect(mf, room.relayUrl, true);
    clients.push(rejected);
    await rejected.next("session");
    const closed = new Promise<number>((resolve) =>
      rejected.socket.addEventListener("close", (event) => resolve(event.code), { once: true }),
    );
    rejected.socket.send(
      JSON.stringify({
        type: "load",
        riv: second.url.replace(/token=.*/, `token=${"x".repeat(43)}`),
        map: {},
      }),
    );
    assert.equal(await closed, 1008);
    assert.equal(
      (await mf.dispatchFetch(`${base}/assets/${first.assetId}`, { method: "DELETE", headers }))
        .status,
      200,
    );
    const cold = await connect(mf, session.relayUrl);
    clients.push(cold);
    await cold.next("session");
    assert.deepEqual(await cold.next("load"), { type: "load", riv: second.url, map: {} });
    assert.deepEqual(await cold.next("map"), map);
    assert.deepEqual(await storage.exec("SELECT * FROM project"), savedProject);
    assert.equal((await mf.dispatchFetch(second.url)).status, 200);
    assert.equal((await mf.dispatchFetch(media.url)).status, 200);
  } finally {
    for (const client of clients) {
      try {
        client.socket.close();
      } catch {}
    }
    await mf.dispose();
  }
});

test("phone reconnect heals legacy dead or malformed Rive loads without clearing other state", async () => {
  const mf = await runtime();
  const clients: Awaited<ReturnType<typeof connect>>[] = [];
  try {
    const room = await createRoom(mf);
    const session = await pairPhone(mf, room);
    const host = await connect(mf, room.relayUrl, true);
    const phone = await connect(mf, session.relayUrl);
    clients.push(host, phone);
    await host.next("session");
    await phone.next("session");
    const asset = await upload(mf, room);
    const load = { type: "load", riv: asset.url, map: {} };
    host.socket.send(JSON.stringify(load));
    assert.deepEqual(await phone.next("load"), load);
    const map = { type: "map", map: {} };
    host.socket.send(JSON.stringify(map));
    assert.deepEqual(await phone.next("map"), map);
    const base = `https://relay.example/v1/rooms/${room.roomId}`;
    assert.equal(
      (
        await mf.dispatchFetch(`${base}/assets/${asset.assetId}`, {
          method: "DELETE",
          headers: auth(room.hostToken),
        })
      ).status,
      200,
    );
    const storage = await mf.unsafeGetDurableObjectStorage("", "RelayRoom", { name: room.roomId });
    for (const stale of [
      JSON.stringify(load),
      JSON.stringify({ ...load, riv: asset.url.replace("relay.example", "attacker.example") }),
      JSON.stringify({ ...load, riv: asset.url.replace(room.roomId, "a".repeat(32)) }),
      "malformed legacy JSON",
    ]) {
      await storage.exec("INSERT OR REPLACE INTO state (name, value) VALUES ('load', ?)", stale);
      const cold = await connect(mf, session.relayUrl);
      clients.push(cold);
      await cold.next("session");
      await cold.next("peers");
      assert.equal(
        cold.messages.some((message) => message.type === "load"),
        false,
      );
      assert.deepEqual(await cold.next("map"), map);
      assert.deepEqual(await storage.exec("SELECT value FROM state WHERE name = 'load'"), []);
      assert.deepEqual(await storage.exec("SELECT value FROM state WHERE name = 'map'"), [
        { value: JSON.stringify(map) },
      ]);
      cold.socket.close();
    }
    await storage.exec("INSERT INTO state (name, value) VALUES ('load', 'malformed legacy JSON')");
    const unrelated = await upload(mf, room);
    assert.equal(
      (
        await mf.dispatchFetch(`${base}/assets/${unrelated.assetId}`, {
          method: "DELETE",
          headers: auth(room.hostToken),
        })
      ).status,
      200,
    );
  } finally {
    for (const client of clients) {
      try {
        client.socket.close();
      } catch {}
    }
    await mf.dispose();
  }
});
