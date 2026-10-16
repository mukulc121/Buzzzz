import { test } from "node:test";
import assert from "node:assert/strict";
import { auth, createRoom, runtime, stringFields } from "./harness.ts";

test("public capability quotas isolate assets, shares, callers and host administration", async () => {
  const mf = await runtime();
  try {
    const room = await createRoom(mf);
    const root = `https://relay.example/v1/rooms/${room.roomId}`;
    const assets: string[] = [];
    const shares: string[] = [];
    for (let index = 0; index < 2; index++) {
      assets.push(
        (
          await stringFields(
            await mf.dispatchFetch(`${root}/assets?kind=rive`, {
              method: "POST",
              headers: {
                ...auth(room.hostToken),
                "Content-Length": "4",
                "Content-Type": "application/octet-stream",
              },
              body: "RIVE",
            }),
            ["path"],
          )
        ).path!,
      );
      shares.push(
        (
          await stringFields(
            await mf.dispatchFetch(`${root}/shares`, {
              method: "POST",
              headers: auth(room.hostToken),
              body: JSON.stringify({
                projectId: `private-${index}`,
                project: {
                  presets: [
                    {
                      id: "tap",
                      name: "Tap",
                      pattern: {
                        discretePattern: [],
                        continuousPattern: { amplitude: [], frequency: [] },
                      },
                    },
                  ],
                  map: {},
                },
              }),
            }),
            ["url"],
          )
        ).url!,
      );
    }
    for (const [kind, urls] of [
      ["asset", assets],
      ["share", shares],
    ] as const) {
      const method = kind === "asset" ? "HEAD" : "GET";
      const read = (url: string, ip: string) =>
        mf.dispatchFetch(url, {
          method,
          headers: { "CF-Connecting-IP": ip },
        });
      const invalid = new URL(urls[0]!);
      invalid.searchParams.set("token", "x".repeat(43));
      const invalidStatuses = await Promise.all(
        Array.from({ length: 481 }, () =>
          read(invalid.href, "203.0.113.1").then((response) => response.status),
        ),
      );
      assert.ok(invalidStatuses.includes(404));
      assert.ok(invalidStatuses.includes(429));
      assert.equal((await read(urls[0]!, "203.0.113.2")).status, 200);
      const validStatuses = await Promise.all(
        Array.from({ length: 241 }, () =>
          read(urls[0]!, "203.0.113.3").then((response) => response.status),
        ),
      );
      assert.equal(validStatuses.filter((status) => status === 200).length, 240);
      assert.equal(validStatuses.filter((status) => status === 429).length, 1);
      assert.equal((await read(urls[1]!, "203.0.113.3")).status, 200);
      assert.equal((await read(urls[0]!, "203.0.113.4")).status, 200);
    }
    assert.equal(
      (await mf.dispatchFetch(`${root}/pairing`, { method: "POST", headers: auth(room.hostToken) }))
        .status,
      200,
    );
  } finally {
    await mf.dispose();
  }
});
