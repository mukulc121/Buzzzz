import { test } from "node:test";
import assert from "node:assert/strict";
import { auth, createRoom, runtime } from "./harness.ts";

test("unknown room probes never allocate application tables", async () => {
  const mf = await runtime();
  try {
    const id = "a".repeat(32);
    const response = await mf.dispatchFetch(`https://relay.example/v1/rooms/${id}/project`);
    assert.equal(response.status, 410);
    const storage = await mf.unsafeGetDurableObjectStorage("", "RelayRoom", { name: id });
    const tables = await storage.exec(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'room'",
    );
    assert.deepEqual(tables, []);
    const room = await createRoom(mf);
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
