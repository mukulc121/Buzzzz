import { expect, test } from "bun:test";
import { emptyPattern, type Pattern } from "@buzzzz/core";
import { receivedPatternRecord } from "../src/features/sessionLibrary/receivedPattern";
import {
  listMediaResources as listCachedPatterns,
  purgeMediaConnection as purgeCachedConnection,
  removeMediaResource as removeCachedPattern,
  renameMediaResources as renameCachedPatterns,
  upsertMediaResource,
} from "../src/features/sessionLibrary/mediaStorage";
import { decodePatternLibrary } from "../src/features/sessionLibrary/patternStorage";
import { createResourceStorage } from "../src/features/sessionLibrary/resourceStorage";
import type { IMediaLibrary } from "../src/features/sessionLibrary/mediaModel";

function cachePattern(
  library: IMediaLibrary,
  connectionId: string,
  packet: Parameters<typeof receivedPatternRecord>[0],
  receivedAt: number,
) {
  return upsertMediaResource(library, connectionId, receivedPatternRecord(packet, receivedAt));
}

const pattern = (): Pattern => ({
  ...emptyPattern(),
  discretePattern: [{ time: 123.5, amplitude: 0.6436, frequency: 0.25 }],
});
const packet = (resourceId: string, name = resourceId) => ({
  resourceId,
  name,
  version: "a".repeat(64),
  pattern: pattern(),
});

function memory(initial: string | null = null) {
  let value = initial;
  const writes: { key: string; value: string }[] = [];
  return {
    adapter: {
      getItem: async (_key: string) => value,
      setItem: async (key: string, next: string) => {
        writes.push({ key, value: next });
        value = next;
      },
    },
    writes,
    read: () => value,
  };
}

test("received resources are scoped per connection, replaced by ID and listed newest first", () => {
  const incoming = packet("same");
  const first = cachePattern({}, "studio-a", incoming, 100);
  const second = cachePattern(first, "studio-b", packet("same", "Other Studio"), 200);
  const third = cachePattern(second, "studio-a", packet("another"), 300);
  const updated = cachePattern(
    third,
    "studio-a",
    { ...packet("same", "Updated"), version: "b".repeat(64) },
    400,
  );
  expect(listCachedPatterns(updated, "studio-a").map((record) => record.name)).toEqual([
    "Updated",
    "another",
  ]);
  expect(listCachedPatterns(updated, "studio-b").map((record) => record.name)).toEqual([
    "Other Studio",
  ]);
  expect(listCachedPatterns(updated, "missing")).toEqual([]);
  expect(listCachedPatterns(updated, "studio-a")[0]).toMatchObject({
    kind: "pattern",
    version: "b".repeat(64),
    receivedAt: 400,
    durationMs: 123.5,
  });
  incoming.pattern.discretePattern[0].amplitude = 0;
  expect(first["studio-a"][0].pattern.discretePattern[0].amplitude).toBe(0.6436);
  expect(first["studio-a"]).toHaveLength(1);
});

test("a manifest only renames existing IDs and retains absent patterns and their receipt order", () => {
  const library = cachePattern(
    cachePattern({}, "studio", packet("kept"), 100),
    "studio",
    packet("renamed"),
    200,
  );
  const renamed = renameCachedPatterns(library, "studio", [
    { resourceId: "renamed", name: "New name" },
    { resourceId: "unknown", name: "Not downloaded" },
  ]);
  expect(renamed.studio).toEqual([{ ...library.studio[0], name: "New name" }, library.studio[1]]);
  expect(renameCachedPatterns(renamed, "studio", [])).toBe(renamed);
  expect(renameCachedPatterns(renamed, "studio", [{ resourceId: "renamed", name: "" }])).toBe(
    renamed,
  );
  expect(renameCachedPatterns(renamed, "unknown", [{ resourceId: "renamed", name: "Other" }])).toBe(
    renamed,
  );
});

test("deleting a resource or connection preserves other connections, including special object keys", () => {
  const library = cachePattern(
    cachePattern({}, "__proto__", packet("constructor"), 100),
    "other",
    packet("constructor"),
    200,
  );
  const removed = removeCachedPattern(library, "__proto__", "constructor");
  expect(listCachedPatterns(removed, "__proto__")).toEqual([]);
  expect(listCachedPatterns(removed, "other")).toHaveLength(1);
  expect(listCachedPatterns(library, "constructor")).toEqual([]);
  expect(purgeCachedConnection(library, "__proto__")).toEqual({ other: library.other });
  expect(removeCachedPattern(library, "other", "missing")).toBe(library);
  expect(purgeCachedConnection(library, "missing")).toBe(library);
});

test("hydration preserves offline replay data, allows original empty versions and keeps newest duplicates", () => {
  const first = receivedPatternRecord({ ...packet("hit"), version: "" }, 100);
  const decoded = decodePatternLibrary(
    JSON.stringify({
      studio: [
        first,
        { ...first, name: "Newest", receivedAt: 300 },
        { ...first, name: "Older", receivedAt: 50 },
      ],
    }),
  );
  expect(decoded.studio).toEqual([{ ...first, name: "Newest", receivedAt: 300 }]);
  expect(decoded.studio[0].pattern).toEqual(pattern());
  expect(decodePatternLibrary(null)).toEqual({});
});

test("invalid persisted data is reported without silently replacing the library", () => {
  const valid = cachePattern({}, "studio", packet("hit"), 100).studio[0];
  for (const data of [
    "not json",
    "null",
    "[]",
    JSON.stringify({ studio: {} }),
    JSON.stringify({ studio: [{ ...valid, pattern: {} }] }),
    JSON.stringify({ studio: [{ ...valid, receivedAt: -1 }] }),
  ])
    expect(() => decodePatternLibrary(data)).toThrow();
});

test("the persistent repository hydrates once and retains records without a connection", async () => {
  const data = memory(JSON.stringify(cachePattern({}, "offline", packet("hit"), 100)));
  const storage = createResourceStorage(data.adapter);
  expect((await storage.load()).offline[0].pattern).toEqual(pattern());
  await storage.update((library) =>
    renameCachedPatterns(library, "offline", [{ resourceId: "hit", name: "Renamed" }]),
  );
  expect(data.writes[0].key).toBe("pulsar:media-library");
  const reopened = createResourceStorage(data.adapter);
  expect((await reopened.load()).offline[0].name).toBe("Renamed");
  await reopened.update((library) => removeCachedPattern(library, "offline", "hit"));
  expect((await reopened.load()).offline).toEqual([]);
  await reopened.update((library) => purgeCachedConnection(library, "offline"));
  expect(await reopened.load()).toEqual({});
});

test("concurrent receipts serialize read/modify/write and a manifest no-op does not write", async () => {
  const data = memory();
  const storage = createResourceStorage(data.adapter);
  await Promise.all([
    storage.update((library) => cachePattern(library, "studio", packet("first"), 100)),
    storage.update((library) => cachePattern(library, "studio", packet("second"), 200)),
  ]);
  expect((await storage.load()).studio.map((record) => record.resourceId)).toEqual([
    "second",
    "first",
  ]);
  expect(decodePatternLibrary(data.read()).studio).toHaveLength(2);
  await storage.update((library) =>
    renameCachedPatterns(library, "studio", [{ resourceId: "not-cached", name: "No download" }]),
  );
  expect(data.writes).toHaveLength(2);
});

test("failed hydration and writes reject, leave saved state intact and allow a later retry", async () => {
  const data = memory();
  let failRead = true;
  let failWrite = true;
  const failure = new Error("Storage unavailable");
  const storage = createResourceStorage({
    getItem: async (key) => {
      if (failRead) {
        failRead = false;
        throw failure;
      }
      return data.adapter.getItem(key);
    },
    setItem: async (key, value) => {
      if (failWrite) {
        failWrite = false;
        throw failure;
      }
      return data.adapter.setItem(key, value);
    },
  });
  await expect(storage.load()).rejects.toBe(failure);
  await expect(
    storage.update((library) => cachePattern(library, "studio", packet("unsaved"), 100)),
  ).rejects.toBe(failure);
  expect(await storage.load()).toEqual({});
  expect(data.read()).toBeNull();
  const saved: IMediaLibrary = await storage.update((library) =>
    cachePattern(library, "studio", packet("saved"), 200),
  );
  expect(saved.studio.map((record) => record.resourceId)).toEqual(["saved"]);
  expect(data.writes).toHaveLength(1);
});
