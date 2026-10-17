import { test } from "node:test";
import assert from "node:assert/strict";
import { auth, createRoom, runtime, stringFields } from "./harness.ts";

test("media upload and read preserve dotLottie MIME while rejecting generic ZIP", async () => {
  const mf = await runtime();
  try {
    const room = await createRoom(mf);
    const body = new Uint8Array([0x50, 0x4b, 3, 4, 1, 2, 3]);
    const url = `https://relay.example/v1/rooms/${room.roomId}/assets?kind=media`;
    const upload = (type: string) =>
      mf.dispatchFetch(url, {
        method: "POST",
        headers: {
          ...auth(room.hostToken),
          "Content-Type": type,
          "Content-Length": String(body.length),
        },
        body,
      });
    assert.equal((await upload("application/zip")).status, 415);
    const response = await upload("application/zip+dotlottie");
    assert.equal(response.status, 201);
    const asset = await stringFields(response, ["url"]);
    const read = await mf.dispatchFetch(asset.url);
    assert.equal(read.headers.get("Content-Type"), "application/zip+dotlottie");
    assert.deepEqual(new Uint8Array(await read.arrayBuffer()), body);
  } finally {
    await mf.dispose();
  }
});
