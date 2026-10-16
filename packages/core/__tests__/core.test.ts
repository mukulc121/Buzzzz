import { describe, expect, test } from "bun:test";
import {
  emptyPattern,
  isPattern,
  MAX_PATTERN_MS,
  patternEnd,
  toDevice,
} from "../src/patterns/pattern.ts";
import { isProject } from "../src/patterns/project.ts";
import { fromDeepLink, parseMessage, relayUrl, type Msg } from "../src/relay/protocol.ts";

describe("Pulsar patterns", () => {
  test.each([
    null,
    {},
    { discretePattern: [null], continuousPattern: { amplitude: [], frequency: [] } },
    {
      discretePattern: [],
      continuousPattern: { amplitude: [{ time: 0, value: NaN }], frequency: [] },
    },
    {
      discretePattern: [{ time: -1, amplitude: 1, frequency: 0.5 }],
      continuousPattern: { amplitude: [], frequency: [] },
    },
    {
      discretePattern: [],
      continuousPattern: { amplitude: [{ time: MAX_PATTERN_MS + 1, value: 1 }], frequency: [] },
    },
  ])("rejects malformed pattern %#", (value) => expect(isPattern(value)).toBe(false));
  test("normalizes without changing the editor data", () => {
    const pattern = emptyPattern();
    pattern.continuousPattern.amplitude = [
      { time: 10.7, value: 1.5 },
      { time: -2, value: -1 },
    ];
    const original = structuredClone(pattern);
    expect(toDevice(pattern).continuousPattern.amplitude).toEqual([
      { time: 0, value: 0 },
      { time: 11, value: 1 },
    ]);
    expect(pattern).toEqual(original);
    expect(patternEnd(emptyPattern())).toBe(0);
    expect(patternEnd(pattern)).toBe(10.7);
  });
  test("preserves 0.01 percent precision in exported and device values", () => {
    const pattern = emptyPattern();
    pattern.discretePattern.push({ time: 100, amplitude: 0.6436, frequency: 0.4527 });
    pattern.continuousPattern.amplitude.push({ time: 100, value: 0.6436 });
    pattern.continuousPattern.frequency.push({ time: 100, value: 0.4527 });
    expect(toDevice(pattern)).toEqual(pattern);
  });
});
describe("project imports", () => {
  const preset = { id: "p1", name: "Test", pattern: emptyPattern() };
  test("checks patterns, unique IDs and mapping targets", () => {
    expect(isProject({ presets: [preset], map: { tap: "p1" } })).toBe(true);
    for (const value of [
      { presets: [], map: {} },
      { presets: [preset, preset], map: {} },
      { presets: [preset], map: { tap: "missing" } },
      { presets: [{ ...preset, pattern: {} }], map: {} },
    ])
      expect(isProject(value)).toBe(false);
  });
});
describe("relay boundaries", () => {
  test("round trips every message type", () => {
    const messages: Msg[] = [
      { type: "load", riv: "/riv/abc123.riv", map: { tap: emptyPattern() } },
      { type: "map", map: {} },
      { type: "play", pattern: emptyPattern() },
      { type: "stop" },
      { type: "fire", name: "tap" },
      { type: "restart" },
      { type: "pause", paused: false },
      { type: "hello", device: "ios 26.5" },
      { type: "fired", name: "tap" },
      { type: "peers", phones: 2 },
    ];
    for (const message of messages) expect(parseMessage(JSON.stringify(message))).toEqual(message);
  });
  test.each([
    "{",
    "null",
    '{"type":"unknown"}',
    '{"type":"pause","paused":1}',
    '{"type":"peers","phones":-1}',
    '{"type":"play","pattern":{}}',
    '{"type":"map","map":{"tap":null}}',
    '{"type":"load","riv":"https://evil.test/payload.riv","map":{}}',
  ])("ignores invalid message %#", (value) => expect(parseMessage(value)).toBeNull());
  test("validates relay URLs and preserves existing query parameters", () => {
    const url = relayUrl(" wss://192.168.0.2:5173/relay?token=hello ");
    expect(url?.protocol).toBe("wss:");
    url?.searchParams.set("role", "phone");
    expect(url?.searchParams.get("token")).toBe("hello");
    for (const input of [
      "http://localhost/relay",
      "ws://user:pass@localhost/relay",
      "ws://localhost/other",
      "broken",
      "ws://localhost/relay#fragment",
    ])
      expect(relayUrl(input)).toBeNull();
  });
  test("ignores other apps and malformed deep links", () => {
    expect(fromDeepLink("rivehaptics://connect?url=ws%3A%2F%2Flocalhost%3A5173%2Frelay")).toBe(
      "ws://localhost:5173/relay",
    );
    for (const input of [
      null,
      "rivehaptics://connect?url=%",
      "https://other.test?url=ws://localhost/relay",
      "rivehaptics://other?url=ws://localhost/relay",
    ])
      expect(fromDeepLink(input)).toBeNull();
  });
});
