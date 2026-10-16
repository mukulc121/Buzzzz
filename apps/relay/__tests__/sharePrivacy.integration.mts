import { test } from "node:test";
import assert from "node:assert/strict";
import { isRecord } from "@buzzzz/core";
import { auth, createRoom, jsonRecord, runtime, stringFields } from "./harness.ts";

test("project switches and MCP edits never replace another project's public share", async () => {
  const mf = await runtime();
  try {
    const room = await createRoom(mf);
    const base = `https://relay.example/v1/rooms/${room.roomId}`;
    const headers = auth(room.hostToken);
    const document = (name: string) => ({
      presets: [
        {
          id: "tap",
          name,
          pattern: { discretePattern: [], continuousPattern: { amplitude: [], frequency: [] } },
        },
      ],
      map: {},
    });
    const first = document("Public A");
    const second = document("Private B");
    const share = await stringFields(
      await mf.dispatchFetch(`${base}/shares`, {
        method: "POST",
        headers,
        body: JSON.stringify({ project: first, projectId: "project-a" }),
      }),
      ["shareId", "url"],
    );
    const legacy = await stringFields(
      await mf.dispatchFetch(`${base}/shares`, {
        method: "POST",
        headers,
        body: JSON.stringify({ project: first, projectId: "project-a" }),
      }),
      ["shareId", "url"],
    );
    const storage = await mf.unsafeGetDurableObjectStorage("", "RelayRoom", { name: room.roomId });
    await storage.exec("UPDATE shares SET project_id = NULL WHERE id = ?", legacy.shareId);
    for (const [projectId, project, baseRevision] of [
      ["project-a", first, 0],
      ["project-b", second, 1],
    ] as const) {
      assert.equal(
        (
          await mf.dispatchFetch(`${base}/project`, {
            method: "PUT",
            headers,
            body: JSON.stringify({ projectId, project, baseRevision }),
          })
        ).status,
        200,
      );
    }
    assert.deepEqual((await jsonRecord(await mf.dispatchFetch(share.url))).project, first);
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
          params: {
            name: "upsert_pattern",
            arguments: { ...second.presets[0], name: "Private B changed", baseRevision: 2 },
          },
        }),
      }),
    );
    assert.ok(isRecord(rpc.result));
    assert.equal(rpc.result.isError, false);
    assert.equal(
      (await jsonRecord(await mf.dispatchFetch(`${base}/project`, { headers }))).projectId,
      "project-b",
    );
    assert.deepEqual((await jsonRecord(await mf.dispatchFetch(share.url))).project, first);
    const updated = document("Public A changed");
    assert.equal(
      (
        await mf.dispatchFetch(`${base}/project`, {
          method: "PUT",
          headers,
          body: JSON.stringify({ project: updated, projectId: "project-a", baseRevision: 3 }),
        })
      ).status,
      200,
    );
    assert.deepEqual((await jsonRecord(await mf.dispatchFetch(share.url))).project, updated);
    assert.deepEqual((await jsonRecord(await mf.dispatchFetch(legacy.url))).project, first);
    for (const projectId of [undefined, "../project", "a".repeat(65)]) {
      assert.equal(
        (
          await mf.dispatchFetch(`${base}/shares`, {
            method: "POST",
            headers,
            body: JSON.stringify({ project: first, projectId }),
          })
        ).status,
        400,
      );
      assert.equal(
        (
          await mf.dispatchFetch(`${base}/project`, {
            method: "PUT",
            headers,
            body: JSON.stringify({ project: first, projectId }),
          })
        ).status,
        400,
      );
    }
  } finally {
    await mf.dispose();
  }
});
