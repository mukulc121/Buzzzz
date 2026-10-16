import { expect, test } from "bun:test";
import { createConnectionStorage } from "../src/features/connection/storage";
import { decodeConnections } from "../src/features/connection/model";

function memory(initial: string | null = null) {
  let value = initial;
  let fail = false;
  return {
    adapter: {
      getItem: async (_key: string) => value,
      setItem: async (_key: string, next: string) => {
        if (fail) throw new Error("disk unavailable");
        value = next;
      },
    },
    fail: (next: boolean) => {
      fail = next;
    },
  };
}

test("saved IDs survive restart and renewed hosted credentials retain the same connection cache scope", async () => {
  const disk = memory();
  const first = createConnectionStorage(disk.adapter);
  const local = await first.add({ url: "ws://192.168.1.2:5173/relay", label: "Local Studio" });
  const remote = await first.add({
    url: `wss://studio.example/relay?room=${"a".repeat(32)}&token=${"b".repeat(43)}`,
    label: "Hosted Studio",
    expiresAt: 50000,
  });
  const restarted = createConnectionStorage(disk.adapter);
  expect((await restarted.load()).map((item) => item.id)).toEqual([local.id, remote.id]);
  const renewed = await restarted.add({
    url: `wss://studio.example/relay?token=${"c".repeat(43)}&room=${"a".repeat(32)}`,
    label: "Hosted Studio",
    expiresAt: 60000,
  });
  expect(renewed.id).toBe(remote.id);
  expect(await restarted.load()).toHaveLength(2);
  await restarted.remove(local.id);
  expect(await createConnectionStorage(disk.adapter).load()).toEqual([renewed]);
});

test("serialized writes preserve concurrent additions and failed removal keeps the durable connection", async () => {
  const disk = memory();
  const store = createConnectionStorage(disk.adapter);
  const [a, b] = await Promise.all([
    store.add({ url: "ws://192.168.1.2:5173/relay", label: "A" }),
    store.add({ url: "ws://192.168.1.3:5173/relay", label: "B" }),
  ]);
  expect(a.id).not.toBe(b.id);
  expect(await store.load()).toEqual([a, b]);
  disk.fail(true);
  await expect(store.remove(a.id)).rejects.toThrow("disk unavailable");
  expect(await store.load()).toEqual([a, b]);
  disk.fail(false);
  await store.remove(a.id);
  expect(await store.load()).toEqual([b]);
});

test("restore ignores corrupt cache entries, unsafe remote WS URLs and duplicate IDs", () => {
  const record = { id: "saved", url: "wss://studio.example/relay", label: "Studio" };
  expect(decodeConnections(null)).toEqual([]);
  expect(decodeConnections("broken")).toEqual([]);
  expect(decodeConnections(JSON.stringify({}))).toEqual([]);
  expect(
    decodeConnections(
      JSON.stringify([
        record,
        { ...record, label: "Duplicate" },
        { ...record, id: "unsafe", url: "ws://public.example/relay" },
        { ...record, id: "bad-expiry", expiresAt: "tomorrow" },
      ]),
    ),
  ).toEqual([{ ...record, url: `${record.url}?role=phone` }]);
});
