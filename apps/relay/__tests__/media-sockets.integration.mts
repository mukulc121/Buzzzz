import { test } from "node:test";
import assert from "node:assert/strict";
import { type Msg } from "@buzzzz/core";
import { auth, connect, createRoom, pairPhone, runtime, stringFields } from "./harness.ts";

function audio(downloadUrl: string): Extract<Msg, { type: "audio-haptics" }> {
  return {
    type: "audio-haptics",
    resourceId: "fanfare",
    name: "Fanfare",
    version: "ab".repeat(32),
    durationMs: 100,
    pattern: { discretePattern: [], continuousPattern: { amplitude: [], frequency: [] } },
    audio: { clipId: "fanfare.mp3", downloadUrl, contentType: "audio/mpeg", size: 6 },
  };
}

test("hosted relay forwards only host-owned signed media with matching stored metadata", async () => {
  const mf = await runtime();
  const clients: Awaited<ReturnType<typeof connect>>[] = [];
  try {
    const room = await createRoom(mf);
    const phoneSession = await pairPhone(mf, room);
    const phone = await connect(mf, phoneSession.relayUrl);
    clients.push(phone);
    await phone.next("session");
    const upload = async (contentType: string) => {
      const response = await mf.dispatchFetch(
        `https://relay.example/v1/rooms/${room.roomId}/assets?kind=media`,
        {
          method: "POST",
          headers: { ...auth(room.hostToken), "Content-Type": contentType, "Content-Length": "6" },
          body: new Uint8Array([73, 68, 51, 4, 0, 0]),
        },
      );
      assert.equal(response.status, 201);
      return await stringFields(response, ["assetId", "url"]);
    };
    const asset = await upload("audio/mpeg");
    const host = await connect(mf, room.relayUrl, true);
    clients.push(host);
    await host.next("session");
    const valid = audio(asset.url);
    host.socket.send(JSON.stringify(valid));
    host.socket.send(JSON.stringify({ type: "stop" }));
    assert.deepEqual(await phone.next("stop"), { type: "stop" });
    assert.equal(
      phone.messages.some((message) => message.type === "audio-haptics"),
      true,
    );
    assert.deepEqual(await phone.next("audio-haptics"), valid);
    const animation = await upload("application/json");
    const animated: Msg = {
      ...valid,
      type: "animation-haptics",
      animation: {
        clipId: "explosion.json",
        downloadUrl: animation.url,
        contentType: "application/json",
        size: 6,
        width: 100,
        height: 100,
        totalFrames: 30,
        frameRate: 60,
      },
    };
    host.socket.send(JSON.stringify(animated));
    const received = await phone.next("animation-haptics");
    assert.deepEqual(received.animation, animated.animation);
    host.socket.close();

    for (const clip of [
      { ...valid.audio, size: 7 },
      { ...valid.audio, contentType: "audio/wav" },
      { ...valid.audio, downloadUrl: asset.url.replace(room.roomId, "f".repeat(32)) },
      { ...valid.audio, downloadUrl: asset.url.replace(/token=.*/, `token=${"x".repeat(43)}`) },
    ]) {
      const rejected = await connect(mf, room.relayUrl, true);
      clients.push(rejected);
      await rejected.next("session");
      const closed = new Promise<number>((resolve) =>
        rejected.socket.addEventListener("close", (event) => resolve(event.code), { once: true }),
      );
      rejected.socket.send(JSON.stringify({ ...valid, audio: clip }));
      assert.equal(await closed, 1008);
      assert.equal(
        phone.messages.some((message) => message.type === "audio-haptics"),
        false,
      );
    }
    const deleted = await mf.dispatchFetch(
      `https://relay.example/v1/rooms/${room.roomId}/assets/${asset.assetId}`,
      {
        method: "DELETE",
        headers: auth(room.hostToken),
      },
    );
    assert.equal(deleted.status, 200);
    const rejected = await connect(mf, room.relayUrl, true);
    clients.push(rejected);
    await rejected.next("session");
    const closed = new Promise<number>((resolve) =>
      rejected.socket.addEventListener("close", (event) => resolve(event.code), { once: true }),
    );
    rejected.socket.send(JSON.stringify(valid));
    assert.equal(await closed, 1008);
    const phoneClosed = new Promise<number>((resolve) =>
      phone.socket.addEventListener("close", (event) => resolve(event.code), { once: true }),
    );
    phone.socket.send(JSON.stringify(animated));
    assert.equal(await phoneClosed, 1008);
  } finally {
    for (const client of clients) {
      try {
        client.socket.close();
      } catch {}
    }
    await mf.dispose();
  }
});
