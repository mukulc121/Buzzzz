import { expect, test } from "bun:test";
import { EditorBridge } from "../src/editorBridge.ts";

test("editor results are bound to the selected host and complete once", async () => {
  const messages: { requestId: string }[] = [];
  const socket = {
    readyState: 1,
    send: (raw: string) => {
      messages.push(JSON.parse(raw));
    },
  };
  const bridge = new EditorBridge(() => [socket]);
  const waiting = bridge.call("editor_cursor", { timeMs: 10 });
  const id = messages[0]!.requestId;
  expect(() => bridge.receive({ ...socket }, { requestId: id, result: {} })).toThrow();
  bridge.receive(socket, { requestId: id, result: { timeMs: 10 } });
  expect(await waiting).toEqual({ timeMs: 10 });
  expect(() => bridge.receive(socket, { requestId: id, result: {} })).not.toThrow();
  expect(() => bridge.receive({ ...socket }, { requestId: id, result: {} })).toThrow();
});

test("editor bridge bounds pending requests and clears them on disconnect", async () => {
  const socket = { readyState: 1, send: () => {} };
  const bridge = new EditorBridge(() => [socket]);
  const pending = Array.from({ length: 8 }, () =>
    bridge
      .call("audio_analyze", {})
      .catch((error: unknown) => (error instanceof Error ? error.message : "unknown")),
  );
  await expect(bridge.call("audio_analyze", {})).rejects.toThrow("8 pending");
  bridge.disconnected(socket);
  expect(
    (await Promise.all(pending)).every(
      (message) => typeof message === "string" && message.includes("disconnected"),
    ),
  ).toBe(true);
});

test("editor bridge expires an unanswered request and requires an open editor", async () => {
  const messages: { requestId: string }[] = [];
  const socket = { readyState: 1, send: (raw: string) => messages.push(JSON.parse(raw)) };
  const bridge = new EditorBridge(() => [socket], 5);
  await expect(bridge.call("audio_analyze", {})).rejects.toThrow("did not answer");
  expect(() =>
    bridge.receive(socket, { requestId: messages[0]!.requestId, result: {} }),
  ).not.toThrow();
  expect(() =>
    bridge.receive({ ...socket }, { requestId: messages[0]!.requestId, result: {} }),
  ).toThrow();
  const next = bridge.call("editor_cursor", { timeMs: 10 });
  bridge.receive(socket, { requestId: messages[1]!.requestId, result: { timeMs: 10 } });
  expect(await next).toEqual({ timeMs: 10 });
  await expect(new EditorBridge(() => []).call("audio_analyze", {})).rejects.toThrow(
    "Open Buzzzz Studio",
  );
});
