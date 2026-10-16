import { expect, test } from "bun:test";
import { emptyPattern, MAX_PATTERN_MS } from "../src/patterns/pattern.ts";
import { parseMessage, type Msg } from "../src/relay/protocol.ts";
import { isRelayMessageAllowed } from "../src/relay/roles.ts";

const preset: Extract<Msg, { type: "haptic-preset" }> = {
  type: "haptic-preset",
  resourceId: "project-a-pattern-a",
  name: "Tap",
  version: "ab".repeat(32),
  pattern: {
    discretePattern: [{ time: 25, amplitude: 0.8, frequency: 0.4 }],
    continuousPattern: { amplitude: [{ time: 100, value: 0.2 }], frequency: [] },
  },
};
const parse = (value: unknown) => parseMessage(JSON.stringify(value));

test("phone library messages round trip device patterns and manifest metadata only", () => {
  const messages: Msg[] = [
    preset,
    { type: "library-manifest-request" },
    { type: "library-manifest", presets: [] },
    { type: "library-manifest", presets: [{ resourceId: preset.resourceId, name: preset.name }] },
  ];
  for (const message of messages) expect(parse(message)).toEqual(message);
  expect(parse({ type: "library-manifest", presets: [preset] })).toEqual({
    type: "library-manifest",
    presets: [{ resourceId: preset.resourceId, name: preset.name }],
  });
});

test("phone library validation keeps the existing project and text bounds", () => {
  expect(parse({ ...preset, resourceId: "x".repeat(512), name: "x".repeat(512) })).not.toBeNull();
  expect(parse({ ...preset, name: "", pattern: emptyPattern() })).not.toBeNull();
  const presets = Array.from({ length: 1000 }, (_, id) => ({ resourceId: String(id), name: "" }));
  expect(parse({ type: "library-manifest", presets })).toEqual({
    type: "library-manifest",
    presets,
  });
  for (const invalid of [
    { ...preset, resourceId: "" },
    { ...preset, resourceId: "x".repeat(513) },
    { ...preset, name: "x".repeat(513) },
    { ...preset, version: "" },
    { ...preset, version: 1 },
    { ...preset, version: "a".repeat(63) },
    { ...preset, version: "A".repeat(64) },
    { ...preset, version: "z".repeat(64) },
    { ...preset, pattern: {} },
    {
      ...preset,
      pattern: {
        ...emptyPattern(),
        discretePattern: [{ time: MAX_PATTERN_MS + 1, amplitude: 1, frequency: 1 }],
      },
    },
    { type: "library-manifest", presets: null },
    { type: "library-manifest", presets: [null] },
    { type: "library-manifest", presets: [{ resourceId: "id" }] },
    { type: "library-manifest", presets: [{ resourceId: "", name: "" }] },
    { type: "library-manifest", presets: [presets[0], presets[0]] },
    { type: "library-manifest", presets: [...presets, { resourceId: "1000", name: "" }] },
  ])
    expect(parse(invalid)).toBeNull();
});

test("host and phone role boundaries preserve legacy commands and isolate library directions", () => {
  const host: Msg["type"][] = [
    "load",
    "map",
    "play",
    "stop",
    "fire",
    "restart",
    "pause",
    "library-manifest",
    "haptic-preset",
  ];
  const phone: Msg["type"][] = ["hello", "fired", "library-manifest-request"];
  for (const type of host) {
    expect(isRelayMessageAllowed("host", type)).toBe(true);
    expect(isRelayMessageAllowed("phone", type)).toBe(false);
  }
  for (const type of phone) {
    expect(isRelayMessageAllowed("phone", type)).toBe(true);
    expect(isRelayMessageAllowed("host", type)).toBe(false);
  }
  for (const type of [
    "peers",
    "editor-command",
    "editor-result",
    "project-changed",
  ] satisfies Msg["type"][]) {
    expect(isRelayMessageAllowed("host", type)).toBe(false);
    expect(isRelayMessageAllowed("phone", type)).toBe(false);
  }
});
