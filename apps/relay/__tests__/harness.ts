import { readFile } from "node:fs/promises";
import { Miniflare } from "miniflare";
import { isRecord } from "@buzzzz/core";

export async function jsonRecord(response: {
  json(): Promise<unknown>;
}): Promise<Record<string, unknown>> {
  const result = await response.json();
  if (!isRecord(result)) throw new Error("Expected a JSON object");
  return result;
}

export async function stringFields(
  response: { json(): Promise<unknown> },
  names: string[],
): Promise<Record<string, string>> {
  const result = await jsonRecord(response);
  const fields: Record<string, string> = {};
  for (const name of names) {
    const value = result[name];
    if (typeof value !== "string") throw new Error(`Expected string ${name}`);
    fields[name] = value;
  }
  return fields;
}

export async function runtime(bindings: Record<string, string> = {}) {
  const mf = new Miniflare({
    modules: true,
    unsafeInspectDurableObjects: true,
    script: await readFile(
      process.env.RELAY_TEST_BUNDLE ??
        new URL("../.wrangler/test-worker.mjs", import.meta.url).pathname,
      "utf8",
    ),
    compatibilityDate: "2026-08-06",
    compatibilityFlags: ["nodejs_compat"],
    durableObjects: {
      ROOMS: { className: "RelayRoom", useSQLite: true },
      PAIRING_CODES: { className: "PairingCode", useSQLite: true },
    },
    r2Buckets: ["ASSETS"],
    ratelimits: {
      EDGE_RATE_LIMITER: { namespace_id: "1001", simple: { limit: 10000, period: 60 } },
      PAIRING_RATE_LIMITER: { namespace_id: "1002", simple: { limit: 10, period: 60 } },
    },
    bindings: {
      STUDIO_ORIGINS: "https://studio.example",
      SESSION_TTL_SECONDS: "86400",
      PAIR_TTL_SECONDS: "600",
      ...bindings,
    },
    cf: false,
  });
  await mf.ready;
  return mf;
}

export async function createRoom(mf: Miniflare) {
  const response = await mf.dispatchFetch("https://relay.example/v1/rooms", {
    method: "POST",
    headers: { Origin: "https://studio.example" },
  });
  if (response.status !== 201)
    throw new Error(`Create room: ${response.status} ${await response.text()}`);
  const data = await jsonRecord(response);
  if (
    typeof data.roomId !== "string" ||
    typeof data.hostToken !== "string" ||
    typeof data.relayUrl !== "string" ||
    typeof data.expiresAt !== "number" ||
    !isRecord(data.pairing) ||
    typeof data.pairing.code !== "string" ||
    typeof data.pairing.expiresAt !== "number"
  )
    throw new Error("Invalid host session response");
  return {
    roomId: data.roomId,
    hostToken: data.hostToken,
    relayUrl: data.relayUrl,
    expiresAt: data.expiresAt,
    pairing: { code: data.pairing.code, expiresAt: data.pairing.expiresAt },
  };
}

export async function pairPhone(mf: Miniflare, room: Awaited<ReturnType<typeof createRoom>>) {
  const response = await mf.dispatchFetch(`https://relay.example/v1/rooms/${room.roomId}/pair`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: room.pairing.code, device: "Test phone" }),
  });
  if (response.status !== 201) throw new Error(`Pair: ${response.status} ${await response.text()}`);
  return stringFields(response, ["phoneToken", "relayUrl"]);
}

export async function connect(mf: Miniflare, url: string, host = false) {
  const response = await mf.dispatchFetch(url.replace(/^ws/, "http"), {
    headers: { Upgrade: "websocket", ...(host ? { Origin: "https://studio.example" } : {}) },
  });
  const socket = response.webSocket;
  if (!socket) throw new Error(`WebSocket: ${response.status} ${await response.text()}`);
  const messages: Record<string, unknown>[] = [];
  const waiters = new Set<() => void>();
  socket.addEventListener("message", (event) => {
    messages.push(JSON.parse(String(event.data)));
    for (const resolve of waiters) resolve();
  });
  socket.accept();
  return {
    socket,
    messages,
    async next(type: string): Promise<Record<string, unknown>> {
      const read = () => {
        const index = messages.findIndex((message) => message.type === type);
        return index < 0 ? undefined : messages.splice(index, 1)[0];
      };
      const existing = read();
      if (existing) return existing;
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          waiters.delete(check);
          reject(new Error(`No ${type} message`));
        }, 2000);
        function check() {
          const message = read();
          if (!message) return;
          clearTimeout(timeout);
          waiters.delete(check);
          resolve(message);
        }
        waiters.add(check);
      });
    },
  };
}

export function auth(token: string) {
  return { Authorization: `Bearer ${token}`, Origin: "https://studio.example" };
}
