import { expect, test } from "bun:test";
import { editorResult, parseMessage } from "../src/index.ts";

const id = "a".repeat(32);
const raw = (value: unknown) => parseMessage(JSON.stringify(value));

test("editor commands need a relay request ID, a known command and bounded args", () => {
  expect(
    raw({ type: "editor-command", requestId: id, command: "editor_cursor", args: {} }),
  ).toEqual({
    type: "editor-command",
    requestId: id,
    command: "editor_cursor",
    args: {},
  });
  expect(
    raw({ type: "editor-command", requestId: "x", command: "editor_cursor", args: {} }),
  ).toBeNull();
  expect(raw({ type: "editor-command", requestId: id, command: "get_room", args: {} })).toBeNull();
  expect(
    raw({ type: "editor-command", requestId: id, command: "editor_cursor", args: [] }),
  ).toBeNull();
  const big = { blob: "x".repeat(64 * 1024) };
  expect(
    raw({ type: "editor-command", requestId: id, command: "audio_analyze", args: big }),
  ).toBeNull();
});

test("editor results carry exactly one of result or error", () => {
  expect(raw({ type: "editor-result", requestId: id, result: { ok: 1 } })).not.toBeNull();
  expect(raw({ type: "editor-result", requestId: id, error: "nope" })).not.toBeNull();
  expect(raw({ type: "editor-result", requestId: id })).toBeNull();
  expect(raw({ type: "editor-result", requestId: id, result: 1, error: "x" })).toBeNull();
  expect(raw({ type: "editor-result", requestId: id, error: "x".repeat(1025) })).toBeNull();
});

test("project-changed requires a non-negative integer revision", () => {
  expect(raw({ type: "project-changed", revision: 3 })).toEqual({
    type: "project-changed",
    revision: 3,
  });
  expect(raw({ type: "project-changed", revision: -1 })).toBeNull();
  expect(raw({ type: "project-changed", revision: 1.5 })).toBeNull();
});

test("editorResult builds replies the relay accepts", () => {
  expect(editorResult(id, { result: undefined })).toEqual({
    type: "editor-result",
    requestId: id,
    result: null,
  });
  expect(editorResult(id, { error: "y".repeat(2000) })).toMatchObject({ error: "y".repeat(1024) });
  expect(editorResult(id, { result: "z".repeat(1024 * 1024) })).toMatchObject({
    error: "Editor result exceeds 1 MiB",
  });
  const message = editorResult(id, { result: { ok: true } });
  expect(raw(message)).toEqual(message);
});
