import { expect, test } from "bun:test";
import { resolvePhoneConnection } from "../src/features/connection/pairing";

const roomId = "b".repeat(32);
const token = "a".repeat(43);

test("numeric pairing posts only to the configured origin and validates the returned room", async () => {
  const expiresAt = Date.now() + 60_000;
  let mode: "valid" | "origin" | "room" | "missing" | "token" | "redirect" = "valid";
  let host = "";
  const server = Bun.serve({
    port: 0,
    hostname: "127.0.0.1",
    async fetch(request) {
      expect(new URL(request.url).pathname).toBe("/v1/pair");
      expect(request.method).toBe("POST");
      expect(await request.json()).toEqual({ code: "001234", device: "Phone" });
      if (mode === "redirect")
        return new Response(null, { status: 307, headers: { Location: "/redirected" } });
      return Response.json({
        roomId: mode === "missing" ? undefined : roomId,
        phoneToken: token,
        expiresAt,
        relayUrl: `ws://${mode === "origin" ? "attacker.example" : host}/relay?room=${mode === "room" ? "c".repeat(32) : roomId}&token=${mode === "token" ? "d".repeat(43) : token}`,
      });
    },
  });
  try {
    host = `127.0.0.1:${server.port}`;
    const props = { input: "001234", device: "Phone", pairingOrigin: server.url.origin };
    expect(await resolvePhoneConnection(props)).toEqual({
      url: `ws://${host}/relay?room=${roomId}&token=${token}`,
      label: host,
      expiresAt,
    });
    for (const next of ["origin", "room", "token"] as const) {
      mode = next;
      await expect(resolvePhoneConnection(props)).rejects.toThrow("invalid relay");
    }
    mode = "missing";
    await expect(resolvePhoneConnection(props)).rejects.toThrow("invalid pairing response");
    mode = "redirect";
    await expect(resolvePhoneConnection(props)).rejects.toThrow();
  } finally {
    await server.stop(true);
  }
});

test("cancelled numeric pairing aborts without creating a socket", async () => {
  const controller = new AbortController();
  controller.abort();
  await expect(
    resolvePhoneConnection({ input: "001234", device: "Phone", signal: controller.signal }),
  ).rejects.toMatchObject({ name: "AbortError" });
});
