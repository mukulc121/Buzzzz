import { expect, test } from "bun:test";
import type { Msg } from "@buzzzz/core";
import { createRelayClient } from "../src/features/connection/relayClient";
import type { openRelayTransport } from "../src/features/connection/relayTransport";

interface ITestSocket {
  events: Parameters<typeof openRelayTransport>[1];
  sent: string[];
  open: boolean;
  closed: boolean;
}

function fixture(hosted = false, expiresAt?: number) {
  const sockets: ITestSocket[] = [];
  const timers = new Map<number, { at: number; repeat: number; callback: () => void }>();
  const states: { status: string; error: string | null }[] = [];
  const messages: { message: Msg; relay: string; id: string }[] = [];
  let now = 1000;
  let sequence = 0;
  const timer = (delay: number, callback: () => void, repeat = 0) => {
    const id = sequence++;
    timers.set(id, { at: now + delay, repeat, callback });
    return () => {
      timers.delete(id);
    };
  };
  const client = createRelayClient({
    connection: {
      id: "studio-a",
      url: hosted
        ? `wss://studio.example/relay?room=${"a".repeat(32)}&token=${"b".repeat(43)}`
        : "ws://192.168.1.2:5173/relay",
      label: "Studio A",
      expiresAt,
    },
    device: "test phone",
    onChange: (state) => states.push(state),
    onMessage: (message, relay, id) => messages.push({ message, relay, id }),
    clock: {
      now: () => now,
      after: (delay, callback) => timer(delay, callback),
      every: (delay, callback) => timer(delay, callback, delay),
    },
    openSocket: (_url, events) => {
      const socket: ITestSocket = { events, sent: [], open: false, closed: false };
      sockets.push(socket);
      return {
        isOpen: () => socket.open && !socket.closed,
        send: (message) => {
          socket.sent.push(message);
        },
        close: () => {
          socket.closed = true;
          socket.open = false;
        },
      };
    },
  });
  return {
    client,
    sockets,
    states,
    messages,
    timers,
    open: (index = sockets.length - 1) => {
      const socket = sockets[index]!;
      socket.open = true;
      socket.events.onOpen();
    },
    advance: (duration: number) => {
      const end = now + duration;
      while (true) {
        const next = [...timers.entries()]
          .filter(([, task]) => task.at <= end)
          .sort((left, right) => left[1].at - right[1].at)[0];
        if (!next) break;
        const [id, task] = next;
        now = task.at;
        if (task.repeat) task.at += task.repeat;
        else timers.delete(id);
        task.callback();
      }
      now = end;
    },
  };
}

test("every socket open announces the phone and refreshes that connection’s saved names", () => {
  const run = fixture();
  run.client.connect();
  expect(run.client.send({ type: "stop" })).toBe(false);
  run.open();
  expect(run.states.at(-1)).toEqual({ status: "connected", error: null });
  expect(run.sockets[0]!.sent.map((value) => JSON.parse(value))).toEqual([
    { type: "hello", device: "test phone" },
    { type: "library-manifest-request" },
  ]);
  run.sockets[0]!.events.onMessage(JSON.stringify({ type: "restart" }));
  expect(run.messages).toEqual([
    {
      message: { type: "restart" },
      relay: "ws://192.168.1.2:5173/relay?role=phone",
      id: "studio-a",
    },
  ]);
  run.advance(25000);
  expect(run.sockets[0]!.sent).toHaveLength(2);
  run.client.dispose();
  expect(run.timers.size).toBe(0);
});

test("the published 15s handshake deadline fails an unreachable relay without retry churn", () => {
  const run = fixture();
  run.client.connect();
  run.advance(14999);
  expect(run.states.at(-1)?.status).toBe("connecting");
  run.advance(1);
  expect(run.states.at(-1)?.status).toBe("error");
  expect(run.sockets[0]!.closed).toBe(true);
  expect(run.timers.size).toBe(0);
});

test("recoverable drops retry independently and superseded socket callbacks stay inert", () => {
  const run = fixture();
  run.client.connect();
  run.open();
  const old = run.sockets[0]!;
  old.events.onClose(1006);
  run.advance(1500);
  expect(run.sockets).toHaveLength(2);
  run.open();
  const count = run.states.length;
  old.events.onMessage(JSON.stringify({ type: "stop" }));
  old.events.onClose(4401);
  old.events.onOpen();
  expect(run.states).toHaveLength(count);
  expect(run.messages).toEqual([]);
  expect(run.client.send({ type: "restart" })).toBe(true);
  expect(run.sockets[1]!.sent.at(-1)).toBe('{"type":"restart"}');
  run.client.dispose();
  run.sockets[1]!.events.onClose(1006);
  run.advance(60000);
  expect(run.sockets).toHaveLength(2);
});

test("only hosted relays receive supported raw heartbeats and expired sessions stay cached offline", () => {
  const run = fixture(true, 30000);
  run.client.connect();
  run.open();
  run.advance(25000);
  expect(run.sockets[0]!.sent.at(-1)).toBe("ping");
  run.sockets[0]!.events.onMessage("pong");
  expect(run.messages).toEqual([]);
  run.advance(25000);
  expect(run.states.at(-1)?.error).toContain("access ended");
  expect(run.timers.size).toBe(0);
  run.client.connect();
  expect(run.sockets).toHaveLength(1);
  expect(run.states.at(-1)?.error).toContain("session expired");
});
