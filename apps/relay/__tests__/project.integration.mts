import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import type { Miniflare } from "miniflare";
import { isRecord } from "@buzzzz/core";
import { auth, createRoom, jsonRecord, runtime } from "./harness.ts";

let mf: Miniflare;
before(async () => {
  mf = await runtime();
});
after(async () => {
  await mf?.dispose();
});

test("canonical HTTP and MCP saves refresh existing shares without changing their tokens", async () => {
  const room = await createRoom(mf);
  const base = `https://relay.example/v1/rooms/${room.roomId}`;
  const headers = auth(room.hostToken);
  const project = {
    presets: [
      {
        id: "tap",
        name: "Original",
        pattern: { discretePattern: [], continuousPattern: { amplitude: [], frequency: [] } },
      },
    ],
    map: {},
    editor: { cursorMs: 250 },
  };
  const shares = await Promise.all(
    [1, 2].map(async () =>
      jsonRecord(
        await mf.dispatchFetch(`${base}/shares`, {
          method: "POST",
          headers,
          body: JSON.stringify({ project, projectId: "project-a" }),
        }),
      ),
    ),
  );
  const updated = { ...project, presets: [{ ...project.presets[0], name: "Updated" }] };
  assert.equal(
    (
      await mf.dispatchFetch(`${base}/project`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ project: updated, projectId: "project-a", baseRevision: 0 }),
      })
    ).status,
    200,
  );
  for (const share of shares)
    assert.deepEqual(
      (await jsonRecord(await mf.dispatchFetch(String(share.url)))).project,
      updated,
    );
  const stale = await mf.dispatchFetch(`${base}/project`, {
    method: "PUT",
    headers,
    body: JSON.stringify({ project, projectId: "project-a", baseRevision: 0 }),
  });
  assert.equal(stale.status, 409);
  assert.deepEqual(
    (await jsonRecord(await mf.dispatchFetch(String(shares[0]!.url)))).project,
    updated,
  );
  assert.equal(
    (
      await mf.dispatchFetch(`${base}/shares/${shares[0]!.shareId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ project }),
      })
    ).status,
    200,
  );
  assert.deepEqual(
    (await jsonRecord(await mf.dispatchFetch(String(shares[0]!.url)))).project,
    project,
  );
  const rpc = await jsonRecord(
    await mf.dispatchFetch(`${base}/mcp`, {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "application/json",
        "MCP-Protocol-Version": "2025-11-25",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name: "upsert_pattern", arguments: { ...updated.presets[0], baseRevision: 1 } },
      }),
    }),
  );
  assert.ok(isRecord(rpc.result));
  assert.equal(rpc.result.isError, false);
  for (const share of shares)
    assert.deepEqual(
      (await jsonRecord(await mf.dispatchFetch(String(share.url)))).project,
      updated,
    );
  assert.equal(
    (await jsonRecord(await mf.dispatchFetch(`${base}/project`, { headers }))).revision,
    2,
  );
});
