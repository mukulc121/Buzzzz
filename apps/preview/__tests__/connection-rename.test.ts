import { expect, test } from "bun:test";
import type { Msg } from "@buzzzz/core";
import {
  connectionDisplayName,
  renamedConnection,
  type IStoredConnection,
} from "../src/features/connection/model";
import { createConnectionStorage } from "../src/features/connection/storage";
import { createRelayConnections } from "../src/features/connection/relayConnections";

function disk(initial: IStoredConnection[] = []) {
  const values = new Map<string, string>([["pulsar:connections", JSON.stringify(initial)]]);
  const writes: string[] = [];
  let failure: Error | undefined;
  return {
    values,
    writes,
    fail: (next: Error | undefined) => {
      failure = next;
    },
    adapter: {
      getItem: async (key: string) => values.get(key) ?? null,
      setItem: async (key: string, value: string) => {
        if (failure) throw failure;
        values.set(key, value);
        writes.push(key);
      },
    },
  };
}

const connection: IStoredConnection = {
  id: "studio",
  label: "Original Studio",
  createdAt: 1234,
  url: `wss://studio.example/relay?room=${"a".repeat(32)}&token=${"b".repeat(43)}`,
  expiresAt: 50000,
};

test("custom names trim whitespace and blank names restore the original server label", () => {
  const renamed = renamedConnection(connection, "  My Studio  ");
  expect(connectionDisplayName(renamed)).toBe("My Studio");
  expect(renamed).toEqual({ ...connection, customName: "My Studio" });
  expect(renamedConnection(renamed, " My Studio ")).toBe(renamed);
  expect(connectionDisplayName(renamedConnection(renamed, " \n\t "))).toBe("Original Studio");
  expect(connectionDisplayName({ label: "Default", customName: "   " })).toBe("Default");
  expect(connectionDisplayName(connection)).toBe("Original Studio");
});

test("rename and blank reset survive restart without changing pairing credentials or cache IDs", async () => {
  const data = disk([connection]);
  data.values.set(
    "pulsar:media-library",
    JSON.stringify({ studio: [{ resourceId: "saved-pattern" }] }),
  );
  const store = createConnectionStorage(data.adapter);
  expect(await store.rename("studio", "  At my desk  ")).toEqual({
    ...connection,
    customName: "At my desk",
  });
  const restarted = createConnectionStorage(data.adapter);
  expect(await restarted.load()).toEqual([{ ...connection, customName: "At my desk" }]);
  await restarted.rename("studio", "");
  expect(await createConnectionStorage(data.adapter).load()).toEqual([connection]);
  expect(JSON.parse(data.values.get("pulsar:media-library")!)).toEqual({
    studio: [{ resourceId: "saved-pattern" }],
  });
  expect(new Set(data.writes)).toEqual(new Set(["pulsar:connections"]));
});

test("renewing hosted credentials preserves the custom name and original creation date", async () => {
  const data = disk([{ ...connection, customName: "Personal name" }]);
  const store = createConnectionStorage(data.adapter);
  const renewed = await store.add({
    url: `wss://studio.example/relay?token=${"c".repeat(43)}&room=${"a".repeat(32)}`,
    label: "Updated server name",
    expiresAt: 60000,
  });
  expect(renewed.id).toBe(connection.id);
  expect(renewed.createdAt).toBe(1234);
  expect(connectionDisplayName(renewed)).toBe("Personal name");
  expect(new URL(renewed.url).searchParams.get("token")).toBe("c".repeat(43));
  await store.rename(connection.id, " ");
  expect(connectionDisplayName((await store.load())[0])).toBe("Updated server name");
});

test("legacy creation dates initialize once and are persisted before publishing restored connections", async () => {
  const { createdAt: _createdAt, ...legacy } = connection;
  const data = disk([legacy]);
  const before = Date.now();
  const restored = await createConnectionStorage(data.adapter).load();
  expect(restored[0].createdAt).toBeGreaterThanOrEqual(before);
  expect(restored[0].createdAt).toBeLessThanOrEqual(Date.now());
  const reopened = await createConnectionStorage(data.adapter).load();
  expect(reopened).toEqual(restored);
  expect(data.writes).toEqual(["pulsar:connections"]);
  const broken = disk([legacy]);
  broken.fail(new Error("migration write failed"));
  const store = createConnectionStorage(broken.adapter);
  await expect(store.load()).rejects.toThrow("migration write failed");
  expect(JSON.parse(broken.values.get("pulsar:connections")!)[0]).not.toHaveProperty("createdAt");
  broken.fail(undefined);
  expect((await store.load())[0].createdAt).toBeNumber();
});

test("failed rename retains the saved label and later retries still work", async () => {
  const data = disk([connection]);
  const store = createConnectionStorage(data.adapter);
  await store.load();
  data.fail(new Error("disk unavailable"));
  await expect(store.rename("studio", "Unsaved")).rejects.toThrow("disk unavailable");
  expect(await store.load()).toEqual([connection]);
  data.fail(undefined);
  await store.rename("studio", "Saved");
  expect((await createConnectionStorage(data.adapter).load())[0].customName).toBe("Saved");
});

test("rename serializes with removal and never recreates a deleted connection", async () => {
  const data = disk([connection]);
  const store = createConnectionStorage(data.adapter);
  await Promise.all([store.rename("studio", "Renamed"), store.remove("studio")]);
  expect(await store.load()).toEqual([]);
  expect(await store.rename("studio", "Too late")).toBeUndefined();
  expect(await createConnectionStorage(data.adapter).load()).toEqual([]);
});

test("unchanged and missing names do not write; names beyond the saved-label boundary reject", async () => {
  const data = disk([{ ...connection, customName: "Custom" }]);
  const store = createConnectionStorage(data.adapter);
  await store.rename("studio", " Custom ");
  await store.rename("missing", "Other");
  expect(data.writes).toEqual([]);
  await expect(store.rename("studio", "x".repeat(513))).rejects.toThrow("512 characters");
  expect(data.writes).toEqual([]);
});

test("live rename leaves sockets, selection, reconnect and message routing intact", () => {
  const clients: {
    starts: number;
    disposed: number;
    sent: Msg[];
    status: (state: { status: "connected"; error: null }) => void;
  }[] = [];
  const relay = createRelayConnections({
    device: "test phone",
    onChange: () => {},
    onMessage: () => {},
    createClient: (props) => {
      const state = { starts: 0, disposed: 0, sent: new Array<Msg>(), status: props.onChange };
      clients.push(state);
      return {
        connect: () => {
          state.starts++;
          props.onChange({ status: "connected", error: null });
        },
        dispose: () => {
          state.disposed++;
        },
        send: (message) => {
          state.sent.push(message);
          return true;
        },
      };
    },
  });
  relay.restore([connection]);
  expect(relay.rename(connection.id, "  Local alias  ")).toBe(true);
  expect(relay.snapshot().connections[0]).toEqual({
    ...connection,
    customName: "Local alias",
    status: "connected",
    error: null,
  });
  expect(relay.snapshot().currentConnectionId).toBe(connection.id);
  expect(clients).toHaveLength(1);
  expect(clients[0].starts).toBe(1);
  expect(clients[0].disposed).toBe(0);
  clients[0].status({ status: "connected", error: null });
  expect(relay.snapshot().connections[0].customName).toBe("Local alias");
  expect(relay.send({ type: "stop" }, connection.id)).toBe(true);
  expect(clients[0].sent).toEqual([{ type: "stop" }]);
  relay.reconnect(connection.id);
  expect(clients[0].starts).toBe(2);
  expect(relay.rename("missing", "Ignored")).toBe(false);
  relay.rename(connection.id, "");
  expect(connectionDisplayName(relay.snapshot().connections[0])).toBe(connection.label);
  relay.remove(connection.id);
  expect(clients[0].disposed).toBe(1);
  expect(relay.snapshot().connections).toEqual([]);
});
