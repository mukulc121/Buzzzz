import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import type { Miniflare } from "miniflare";
import { auth, connect, createRoom, jsonRecord, pairPhone, runtime } from "./harness.ts";

let mf: Miniflare;
before(async () => {
  mf = await runtime();
});
after(async () => {
  await mf?.dispose();
});
const pattern = { discretePattern: [], continuousPattern: { amplitude: [], frequency: [] } };
const project = { presets: [{ id: "tap", name: "Tap", pattern }], map: {} };

function rpc(
  room: Awaited<ReturnType<typeof createRoom>>,
  method: string,
  params: Record<string, unknown> = {},
  token = room.hostToken,
) {
  return mf.dispatchFetch(`https://relay.example/v1/rooms/${room.roomId}/mcp`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json,text/event-stream",
      "MCP-Protocol-Version": "2025-11-25",
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
}
async function call(
  room: Awaited<ReturnType<typeof createRoom>>,
  name: string,
  args: Record<string, unknown> = {},
) {
  const body = await jsonRecord(await rpc(room, "tools/call", { name, arguments: args }));
  if (typeof body.result !== "object" || body.result === null || Array.isArray(body.result))
    throw new Error("Expected a tool result");
  return jsonRecord(new Response(JSON.stringify(body.result)));
}

test("canonical project writes use optimistic revisions and notify hosts", async () => {
  const room = await createRoom(mf);
  const host = await connect(mf, room.relayUrl, true);
  const url = `https://relay.example/v1/rooms/${room.roomId}/project`;
  assert.deepEqual(
    await jsonRecord(await mf.dispatchFetch(url, { headers: auth(room.hostToken) })),
    { project: null, revision: 0, projectId: null },
  );
  const write = await mf.dispatchFetch(url, {
    method: "PUT",
    headers: auth(room.hostToken),
    body: JSON.stringify({ project, projectId: "project-a", baseRevision: 0 }),
  });
  assert.equal(write.status, 200);
  assert.equal((await host.next("project-changed")).revision, 1);
  const attempts = await Promise.all(
    ["One", "Two"].map((name) =>
      mf.dispatchFetch(url, {
        method: "PUT",
        headers: auth(room.hostToken),
        body: JSON.stringify({
          project: { ...project, presets: [{ ...project.presets[0], name }] },
          projectId: "project-a",
          baseRevision: 1,
        }),
      }),
    ),
  );
  assert.deepEqual(attempts.map((item) => item.status).sort(), [200, 409]);
  const conflict = attempts.find((item) => item.status === 409)!;
  assert.equal((await jsonRecord(conflict)).revision, 2);
  host.socket.close();
});

test("MCP supports discovery, legacy initialization, and host-only access", async () => {
  const room = await createRoom(mf);
  const init = await jsonRecord(
    await rpc(room, "initialize", {
      protocolVersion: "2025-11-25",
      capabilities: {},
      clientInfo: { name: "Test", version: "1" },
    }),
  );
  assert.ok(init.result);
  const listed = await jsonRecord(await rpc(room, "tools/list"));
  assert.match(JSON.stringify(listed), /audio_analyze/);
  assert.match(JSON.stringify(listed), /list_room_assets/);
  const phone = await pairPhone(mf, room);
  assert.equal((await rpc(room, "tools/list", {}, phone.phoneToken)).status, 403);
  const other = await createRoom(mf);
  assert.equal((await rpc(room, "tools/list", {}, other.hostToken)).status, 401);
  const modern = {
    jsonrpc: "2.0",
    id: "discover",
    method: "server/discover",
    params: {
      _meta: {
        "io.modelcontextprotocol/protocolVersion": "2026-07-28",
        "io.modelcontextprotocol/clientCapabilities": {},
      },
    },
  };
  const headers = {
    Authorization: `Bearer ${room.hostToken}`,
    "Content-Type": "application/json",
    "MCP-Protocol-Version": "2026-07-28",
    "Mcp-Method": "server/discover",
  };
  const response = await mf.dispatchFetch(`https://relay.example/v1/rooms/${room.roomId}/mcp`, {
    method: "POST",
    headers,
    body: JSON.stringify(modern),
  });
  assert.equal(response.status, 200);
  assert.match(JSON.stringify(await response.json()), /supportedVersions/);
  const mismatch = await mf.dispatchFetch(`https://relay.example/v1/rooms/${room.roomId}/mcp`, {
    method: "POST",
    headers: { ...headers, "Mcp-Method": "tools/list" },
    body: JSON.stringify(modern),
  });
  assert.equal(mismatch.status, 400);
  assert.match(JSON.stringify(await mismatch.json()), /-32020/);
});

test("MCP edits validated project patterns without overwriting stale revisions", async () => {
  const room = await createRoom(mf);
  assert.equal((await call(room, "set_project", { project, baseRevision: 0 })).isError, false);
  assert.equal(
    (await call(room, "upsert_pattern", { id: "second", name: "Second", pattern, baseRevision: 1 }))
      .isError,
    false,
  );
  assert.equal((await call(room, "delete_pattern", { id: "tap", baseRevision: 2 })).isError, false);
  const listed = await call(room, "list_patterns");
  assert.match(JSON.stringify(listed.structuredContent), /second/);
  const stale = await call(room, "set_project", { project, baseRevision: 0 });
  assert.equal(stale.isError, true);
  assert.match(JSON.stringify(stale), /revision changed/);
  assert.equal((await call(room, "upsert_pattern", { name: "Bad", pattern: {} })).isError, true);
  assert.equal((await call(room, "audio_analyze")).isError, true);
  assert.match(JSON.stringify(await call(room, "audio_analyze")), /Open Buzzzz Studio/);
});

test("MCP sends validated haptics to the paired phone", async () => {
  const room = await createRoom(mf);
  const phone = await pairPhone(mf, room);
  const connection = await connect(mf, phone.relayUrl);
  assert.equal((await call(room, "play_pattern", { pattern })).isError, false);
  assert.deepEqual((await connection.next("play")).pattern, pattern);
  assert.equal((await call(room, "stop_playback")).isError, false);
  await connection.next("stop");
  connection.socket.close();
});

test("browser tools return only the assigned editor's bounded result", async () => {
  const room = await createRoom(mf);
  const host = await connect(mf, room.relayUrl, true);
  const request = call(room, "editor_cursor", { timeMs: 250 });
  const command = await host.next("editor-command");
  assert.equal(command.command, "editor_cursor");
  assert.deepEqual(command.args, { timeMs: 250 });
  const second = await connect(mf, room.relayUrl, true);
  const rejected = new Promise<number>((resolve) =>
    second.socket.addEventListener("close", (event) => resolve(event.code), { once: true }),
  );
  second.socket.send(
    JSON.stringify({
      type: "editor-result",
      requestId: command.requestId,
      result: { forged: true },
    }),
  );
  assert.equal(await rejected, 1008);
  host.socket.send(
    JSON.stringify({
      type: "editor-result",
      requestId: command.requestId,
      result: { timeMs: 250 },
    }),
  );
  const response = await request;
  assert.equal(response.isError, false);
  assert.deepEqual(response.structuredContent, { timeMs: 250 });
  host.socket.send(
    JSON.stringify({
      type: "editor-result",
      requestId: command.requestId,
      result: { timeMs: 250 },
    }),
  );
  const nextRequest = call(room, "editor_cursor", { timeMs: 300 });
  const nextCommand = await host.next("editor-command");
  host.socket.send(
    JSON.stringify({
      type: "editor-result",
      requestId: nextCommand.requestId,
      result: { timeMs: 300 },
    }),
  );
  assert.deepEqual((await nextRequest).structuredContent, { timeMs: 300 });
  const unsafe = await call(room, "media_attach", {
    kind: "audio",
    filename: "private.wav",
    assetUrl: "https://attacker.example/private.wav",
  });
  assert.equal(unsafe.isError, true);
  host.socket.close();
});
