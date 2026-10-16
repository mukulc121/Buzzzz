import { createHash } from "node:crypto";
import { expect, test } from "bun:test";
import { parseMessage, toDevice, type Pattern } from "@buzzzz/core";
import { phoneLibrary, phonePlayback } from "../src/features/connection/phoneLibrary";

const pattern: Pattern = {
  discretePattern: [
    { time: 300, amplitude: 0.7, frequency: 0.2 },
    { time: 10, amplitude: 1, frequency: 0.5 },
  ],
  continuousPattern: {
    amplitude: [
      { time: 400, value: 0 },
      { time: 0, value: 0.7 },
    ],
    frequency: [{ time: 0, value: 0.5 }],
  },
};

test("the manifest carries only project preset names and identities", () => {
  const presets = [
    { id: "first", name: "First", pattern },
    { id: "second", name: "Second", pattern },
  ];
  const manifest = phoneLibrary(presets);
  expect(manifest).toEqual({
    type: "library-manifest",
    presets: [
      { resourceId: "first", name: "First" },
      { resourceId: "second", name: "Second" },
    ],
  });
  expect(parseMessage(JSON.stringify(manifest))).toEqual(manifest);
  expect(
    phoneLibrary(presets.map((preset) => ({ ...preset, pattern: toDevice(pattern) }))),
  ).toEqual(manifest);
  expect(phoneLibrary([])).toEqual({ type: "library-manifest", presets: [] });
});

test("named playback hashes the actual normalized device pattern without changing its input", async () => {
  const original = structuredClone(pattern);
  const message = await phonePlayback(pattern, { resourceId: "preset-id", name: "My pattern" });
  if (message.type !== "haptic-preset") throw new Error("Missing named playback");
  const device = toDevice(pattern);
  expect(message).toEqual({
    type: "haptic-preset",
    resourceId: "preset-id",
    name: "My pattern",
    version: createHash("sha256").update(JSON.stringify(device)).digest("hex"),
    pattern: device,
  });
  expect(parseMessage(JSON.stringify(message))).toEqual(message);
  expect(pattern).toEqual(original);
  expect(
    await phonePlayback(pattern, { resourceId: "library:example", name: "Renamed" }),
  ).toMatchObject({ resourceId: "library:example", name: "Renamed", version: message.version });
});

test("anonymous playback retains the legacy protocol without a second named command", async () => {
  expect(await phonePlayback(pattern)).toEqual({ type: "play", pattern: toDevice(pattern) });
});
