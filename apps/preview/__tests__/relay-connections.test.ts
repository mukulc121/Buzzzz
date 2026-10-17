import { expect, test } from "bun:test";
import type { Msg } from "@buzzzz/core";
import { createRelayConnections } from "../src/features/connection/relayConnections";
import type { createRelayClient } from "../src/features/connection/relayClient";

function fixture() {
  const instances: {
    props: Parameters<typeof createRelayClient>[0];
    starts: number;
    disposed: number;
    sent: Msg[];
  }[] = [];
  const received: { message: Msg; id: string }[] = [];
  const relay = createRelayConnections({
    device: "test phone",
    onMessage: (message, _url, id) => received.push({ message, id }),
    onChange: () => {},
    createClient: (props) => {
      const entry: (typeof instances)[number] = { props, starts: 0, disposed: 0, sent: [] };
      instances.push(entry);
      return {
        connect: () => {
          entry.starts++;
          props.onChange({ status: "connected", error: null });
        },
        dispose: () => {
          entry.disposed++;
        },
        send: (message) => {
          entry.sent.push(message);
          return true;
        },
      };
    },
  });
  const records = [
    { id: "a", url: "ws://192.168.1.2:5173/relay", label: "Studio A" },
    { id: "b", url: "ws://192.168.1.3:5173/relay", label: "Studio B" },
  ];
  return { relay, instances, received, records };
}

test("restored connections stay simultaneous and commands route to explicit or current IDs", () => {
  const run = fixture();
  run.relay.restore(run.records);
  expect(run.relay.snapshot().connections.map((item) => item.id)).toEqual(["a", "b"]);
  expect(run.instances.map((item) => item.starts)).toEqual([1, 1]);
  run.instances[0]!.props.onMessage({ type: "stop" }, run.records[0]!.url, "a");
  run.instances[1]!.props.onMessage({ type: "restart" }, run.records[1]!.url, "b");
  expect(run.received.map((item) => item.id)).toEqual(["a", "b"]);
  run.relay.send({ type: "stop" });
  run.relay.send({ type: "restart" }, "b");
  expect(run.instances.map((item) => item.sent)).toEqual([
    [{ type: "stop" }],
    [{ type: "restart" }],
  ]);
  expect(run.relay.select("b")).toBe(true);
  expect(run.relay.select("missing")).toBe(false);
  run.relay.send({ type: "stop" });
  expect(run.instances[1]!.sent.at(-1)).toEqual({ type: "stop" });
});

test("foreground retries only interrupted entries and removing one leaves the other live", () => {
  const run = fixture();
  run.relay.restore(run.records);
  run.instances[1]!.props.onChange({ status: "error", error: "offline" });
  run.relay.reconnectInterrupted();
  expect(run.instances.map((item) => item.starts)).toEqual([1, 2]);
  run.relay.reconnect("a");
  expect(run.instances.map((item) => item.starts)).toEqual([2, 2]);
  run.relay.remove("a");
  expect(run.relay.snapshot().currentConnectionId).toBe("b");
  expect(run.relay.snapshot().connections.map((item) => item.id)).toEqual(["b"]);
  expect(run.instances.map((item) => item.disposed)).toEqual([1, 0]);
  run.instances[0]!.props.onChange({ status: "error", error: "stale" });
  run.instances[0]!.props.onMessage({ type: "stop" }, run.records[0]!.url, "a");
  expect(run.received).toEqual([]);
  expect(run.relay.send({ type: "stop" }, "a")).toBe(false);
  expect(run.relay.send({ type: "stop" })).toBe(true);
  run.relay.dispose();
  expect(run.instances.map((item) => item.disposed)).toEqual([1, 1]);
});
