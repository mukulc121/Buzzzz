import { afterEach, expect, test } from "bun:test";
import { mkdtemp, mkdir, readFile, rm, writeFile, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { emptyPattern } from "@buzzzz/core";
import { createReceivedMediaCache } from "../src/features/sessionLibrary/mediaCache";
import type {
  ICachedMedia,
  IMediaFiles,
  IReceivedMedia,
} from "../src/features/sessionLibrary/mediaModel";
import { decodeMediaLibrary } from "../src/features/sessionLibrary/mediaStorage";
import { mediaClipPath } from "../src/features/sessionLibrary/mediaPaths";
import { receivedPatternRecord } from "../src/features/sessionLibrary/receivedPattern";
import {
  upsertMediaResource,
  purgeMediaConnection as purgeCachedConnection,
  removeMediaResource as removeCachedPattern,
} from "../src/features/sessionLibrary/mediaStorage";
import type { IMediaLibrary } from "../src/features/sessionLibrary/mediaModel";
import { receivedMediaRecord } from "../src/features/sessionLibrary/receivedMedia";
import { createResourceStorage } from "../src/features/sessionLibrary/resourceStorage";

function cachePattern(
  library: IMediaLibrary,
  connectionId: string,
  packet: Parameters<typeof receivedPatternRecord>[0],
  receivedAt: number,
) {
  return upsertMediaResource(library, connectionId, receivedPatternRecord(packet, receivedAt));
}

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function packet(
  resourceId = "fanfare",
  clipId = "audio-1",
): IReceivedMedia & { type: "audio-haptics" } {
  return {
    type: "audio-haptics",
    resourceId,
    name: "FanfareSound",
    version: "a".repeat(64),
    durationMs: 5187,
    pattern: {
      ...emptyPattern(),
      discretePattern: [{ time: 123.5, amplitude: 0.6436, frequency: 0.25 }],
    },
    audio: {
      clipId,
      contentType: "audio/mpeg",
      size: 5,
      downloadUrl: "https://studio.example/media/clip",
    },
    volume: 0.8,
    offsetMs: 120,
    window: { startMs: 35, durationMs: 4704 },
  };
}

function memory(initial: string | null = null) {
  let text = initial;
  const writes: string[] = [];
  return {
    adapter: {
      getItem: async (_key: string) => text,
      setItem: async (_key: string, next: string) => {
        text = next;
        writes.push(next);
      },
    },
    writes,
    read: () => text,
  };
}

async function disk() {
  const root = await mkdtemp(join(tmpdir(), "buzzzz-media-cache-"));
  roots.push(root);
  const downloads: string[] = [];
  const path = (relative: string) => join(root, "pulsar-media", relative);
  const files: IMediaFiles = {
    uri: (relative) => pathToFileURL(path(relative)).href,
    exists: async (relative) => {
      try {
        await access(path(relative));
        return true;
      } catch {
        return false;
      }
    },
    download: async (url, relative, onProgress) => {
      downloads.push(url);
      await mkdir(dirname(path(relative)), { recursive: true });
      await writeFile(path(relative), new Uint8Array([1, 2, 3, 4, 5]));
      onProgress?.(1);
    },
    remove: async (relative) => {
      await rm(path(relative), { force: true });
    },
    purge: async (connectionId) => {
      await rm(path(connectionId), { recursive: true, force: true });
    },
  };
  return { root, files, downloads, path };
}

test("received audio persists its original metadata and reopens entirely offline", async () => {
  const data = memory();
  const media = await disk();
  const cache = createReceivedMediaCache({
    files: media.files,
    storage: createResourceStorage(data.adapter),
    now: () => 100,
  });
  const incoming = packet();
  const saved = await cache.receive("studio-a", incoming);
  incoming.pattern.discretePattern[0].amplitude = 0;
  expect(saved?.record).toMatchObject({
    kind: "audio",
    clipPath: "studio-a/audio-1.mp3",
    sizeBytes: 5,
    offset: 120,
    volume: 0.8,
    soundStartMs: 35,
    soundDurationMs: 4704,
    receivedAt: 100,
  });
  expect(saved?.record.pattern.discretePattern[0].amplitude).toBe(0.6436);
  expect(data.read()).not.toContain("localUri");
  expect(data.read()).not.toContain("downloadUrl");
  const offline = createReceivedMediaCache({
    files: {
      ...media.files,
      download: async () => {
        throw new Error("offline");
      },
    },
    storage: createResourceStorage(data.adapter),
  });
  const reopened = await offline.get("studio-a", "fanfare");
  expect(reopened).toEqual(saved);
  expect(await readFile(new URL(reopened!.localUri!))).toEqual(Buffer.from([1, 2, 3, 4, 5]));
  expect(media.downloads).toHaveLength(1);
});

test("animation JSON and zipped Lottie use the source filename mapping", async () => {
  const media = await disk();
  const data = memory();
  const cache = createReceivedMediaCache({
    files: media.files,
    storage: createResourceStorage(data.adapter),
  });
  const base = packet();
  for (const [contentType, extension] of [
    ["application/json", "json"],
    ["application/zip", "lottie"],
  ]) {
    const saved = await cache.receive("studio", {
      ...base,
      type: "animation-haptics",
      resourceId: extension,
      animation: {
        ...base.audio,
        clipId: extension,
        contentType,
        totalFrames: 140,
        frameRate: 60.000002092634,
        width: 1000,
        height: 1000,
      },
    });
    expect(saved?.record.kind).toBe("animation");
    expect(saved?.record.clipPath).toBe(`studio/${extension}.${extension}`);
  }
  expect(mediaClipPath("studio", "raw", "application/octet-stream")).toBe("studio/raw.bin");
  expect(mediaClipPath("studio", "sound", "audio/wav")).toBe("studio/sound.wav");
});

test("cached clips are reused across versions and receipts replace only their scoped resource", async () => {
  const data = memory();
  const media = await disk();
  let time = 100;
  const cache = createReceivedMediaCache({
    files: media.files,
    storage: createResourceStorage(data.adapter),
    now: () => time++,
  });
  await cache.receive("a", packet());
  await cache.receive("b", packet());
  const progress: number[] = [];
  await cache.receive("a", { ...packet(), name: "Updated", version: "b".repeat(64) }, (value) =>
    progress.push(value),
  );
  expect(media.downloads).toHaveLength(2);
  expect(progress).toEqual([1]);
  expect((await cache.list("a")).map(({ record }) => record.name)).toEqual(["Updated"]);
  expect((await cache.list("b")).map(({ record }) => record.name)).toEqual(["FanfareSound"]);
});

test("replacement and deletion keep a clip until its final cached reference is removed", async () => {
  const data = memory();
  const media = await disk();
  const cache = createReceivedMediaCache({
    files: media.files,
    storage: createResourceStorage(data.adapter),
  });
  await cache.receive("studio", packet("first", "shared"));
  await cache.receive("studio", packet("second", "shared"));
  await cache.receive("studio", packet("first", "replacement"));
  expect(await media.files.exists("studio/shared.mp3")).toBe(true);
  await cache.remove("studio", "second");
  expect(await media.files.exists("studio/shared.mp3")).toBe(false);
  expect(await media.files.exists("studio/replacement.mp3")).toBe(true);
});

test("manifests rename cached patterns and media only, retain absent IDs, and never fetch", async () => {
  const data = memory();
  const media = await disk();
  const storage = createResourceStorage(data.adapter);
  const cache = createReceivedMediaCache({ files: media.files, storage });
  await cache.receive("studio", packet());
  await storage.update((library) =>
    cachePattern(
      library,
      "studio",
      { resourceId: "hit", name: "Hit", version: "", pattern: emptyPattern() },
      10,
    ),
  );
  await cache.manifest("studio", [
    { resourceId: "fanfare", name: "Sound" },
    { resourceId: "hit", name: "Tap" },
    { resourceId: "unknown", name: "No download" },
  ]);
  expect((await cache.list("studio")).map(({ record }) => record.name)).toEqual(["Sound", "Tap"]);
  const writes = data.writes.length;
  await cache.manifest("studio", [{ resourceId: "fanfare", name: "" }]);
  expect(data.writes).toHaveLength(writes);
  expect(media.downloads).toHaveLength(1);
});

test("concurrent mixed-library writes and later pattern updates preserve media", async () => {
  const data = memory();
  const media = await disk();
  const storage = createResourceStorage(data.adapter);
  const cache = createReceivedMediaCache({ files: media.files, storage, now: () => 30 });
  const hit = { resourceId: "hit", name: "Hit", version: "", pattern: emptyPattern() };
  await Promise.all([
    cache.receive("studio", packet()),
    storage.update((library) => cachePattern(library, "studio", hit, 10)),
  ]);
  await storage.update((library) =>
    cachePattern(library, "studio", { ...hit, resourceId: "another" }, 20),
  );
  await storage.update((library) => removeCachedPattern(library, "studio", "hit"));
  expect((await cache.list("studio")).map(({ record }) => record.resourceId)).toEqual([
    "fanfare",
    "another",
  ]);
  const reopened = createResourceStorage(data.adapter);
  expect((await reopened.load()).studio.map((record) => record.resourceId)).toEqual([
    "fanfare",
    "another",
  ]);
  await reopened.update((library) => cachePattern(library, "studio", hit, 40));
  expect(decodeMediaLibrary(data.read()).studio.map((record) => record.kind)).toEqual([
    "pattern",
    "audio",
    "pattern",
  ]);
});

test("legacy absolute URIs rebase to this install and missing clips are reported without fetching", async () => {
  const record = receivedMediaRecord("studio", packet(), 100);
  const { clipPath: _clipPath, ...legacy } = record;
  const data = memory(
    JSON.stringify({
      studio: [
        { ...legacy, localUri: "file:///old-install/Documents/pulsar-media/studio/audio-1.mp3" },
      ],
    }),
  );
  const media = await disk();
  const cache = createReceivedMediaCache({
    files: media.files,
    storage: createResourceStorage(data.adapter),
  });
  const loaded = await cache.get("studio", "fanfare");
  expect(loaded?.localUri).toBe(media.files.uri("studio/audio-1.mp3"));
  expect(loaded?.localUri).not.toContain("old-install");
  expect(loaded?.clipMissing).toBe(true);
  expect(media.downloads).toEqual([]);
});

test("remove and purge delete local media only for their selected connection", async () => {
  const data = memory();
  const media = await disk();
  const cache = createReceivedMediaCache({
    files: media.files,
    storage: createResourceStorage(data.adapter),
  });
  await cache.receive("a", packet());
  await cache.receive("a", packet("second", "second"));
  await cache.receive("b", packet());
  await cache.remove("a", "fanfare");
  expect(await media.files.exists("a/audio-1.mp3")).toBe(false);
  await cache.purge("a");
  expect(await cache.list("a")).toEqual([]);
  expect((await cache.get("b", "fanfare"))?.clipMissing).toBe(false);
  expect(await media.files.exists("a/second.mp3")).toBe(false);
});

test("a failed download leaves the previous offline resource usable and the next receipt can retry", async () => {
  const data = memory();
  const media = await disk();
  const storage = createResourceStorage(data.adapter);
  const cache = createReceivedMediaCache({ files: media.files, storage });
  await cache.receive("studio", packet());
  const broken = createReceivedMediaCache({
    files: {
      ...media.files,
      download: async () => {
        throw new Error("HTTP 503");
      },
    },
    storage,
  });
  await expect(broken.receive("studio", packet("fanfare", "new"))).rejects.toThrow("HTTP 503");
  expect((await cache.get("studio", "fanfare"))?.record).toMatchObject({ clipId: "audio-1" });
  expect(await media.files.exists("studio/audio-1.mp3")).toBe(true);
  await cache.receive("studio", packet("fanfare", "new"));
  expect((await cache.get("studio", "fanfare"))?.record).toMatchObject({ clipId: "new" });
  expect(await media.files.exists("studio/audio-1.mp3")).toBe(false);
});

test("a failed index write rejects and retains the previous clip until a successful retry", async () => {
  const data = memory();
  const media = await disk();
  let fail = false;
  const storage = createResourceStorage({
    ...data.adapter,
    setItem: async (key, next) => {
      if (fail) throw new Error("disk full");
      await data.adapter.setItem(key, next);
    },
  });
  const cache = createReceivedMediaCache({ files: media.files, storage });
  await cache.receive("studio", packet());
  fail = true;
  await expect(cache.receive("studio", packet("fanfare", "new"))).rejects.toThrow("disk full");
  expect((await cache.get("studio", "fanfare"))?.record).toMatchObject({ clipId: "audio-1" });
  expect(await media.files.exists("studio/audio-1.mp3")).toBe(true);
  fail = false;
  await cache.receive("studio", packet("fanfare", "new"));
  expect(await media.files.exists("studio/audio-1.mp3")).toBe(false);
  expect(media.downloads).toHaveLength(2);
});

test("purging during a download cannot let its late completion resurrect the connection", async () => {
  const data = memory();
  const media = await disk();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const cache = createReceivedMediaCache({
    files: {
      ...media.files,
      download: async (...args) => {
        await gate;
        await media.files.download(...args);
      },
    },
    storage: createResourceStorage(data.adapter),
  });
  const receiving = cache.receive("studio", packet());
  const purging = cache.purge("studio");
  release();
  await receiving;
  await purging;
  expect(await cache.list("studio")).toEqual([]);
  expect(await media.files.exists("studio/audio-1.mp3")).toBe(false);
});

test("a stalled connection cannot block another download or its own purge", async () => {
  const data = memory();
  const media = await disk();
  const started = deferred<void>();
  const gate = deferred<void>();
  let signal: AbortSignal | undefined;
  const cache = createReceivedMediaCache({
    files: {
      ...media.files,
      download: async (url, path, progress, cancel) => {
        if (path.startsWith("blocked/")) {
          signal = cancel;
          started.resolve();
          await gate.promise;
        }
        await media.files.download(url, path, progress, cancel);
      },
    },
    storage: createResourceStorage(data.adapter),
  });
  const blocked = cache.receive("blocked", packet());
  await started.promise;
  try {
    const other = await cache.receive("other", packet());
    expect(other?.record.kind).toBe("audio");
    await cache.purge("blocked");
    expect(signal?.aborted).toBe(true);
    expect(await cache.list("blocked")).toEqual([]);
    expect(await cache.list("other")).toHaveLength(1);
  } finally {
    gate.resolve();
    expect(await blocked).toBeUndefined();
  }
  expect(await media.files.exists("blocked/audio-1.mp3")).toBe(false);
}, 2000);

test("removing one pending resource preserves a shared clip download for another", async () => {
  const data = memory();
  const media = await disk();
  const started = deferred<void>();
  const gate = deferred<void>();
  let calls = 0;
  let signal: AbortSignal | undefined;
  const cache = createReceivedMediaCache({
    files: {
      ...media.files,
      download: async (url, path, progress, cancel) => {
        calls++;
        signal = cancel;
        started.resolve();
        await gate.promise;
        await media.files.download(url, path, progress, cancel);
      },
    },
    storage: createResourceStorage(data.adapter),
  });
  const first = cache.receive("studio", packet("first", "shared"));
  await started.promise;
  const second = cache.receive("studio", packet("second", "shared"));
  await cache.remove("studio", "first");
  expect(signal?.aborted).toBe(false);
  gate.resolve();
  expect(await first).toBeUndefined();
  expect((await second)?.record.resourceId).toBe("second");
  expect(calls).toBe(1);
  expect(await media.files.exists("studio/shared.mp3")).toBe(true);
  expect((await cache.list("studio")).map(({ record }) => record.resourceId)).toEqual(["second"]);
});

test("an aborted transfer can be received again after connection removal", async () => {
  const data = memory();
  const media = await disk();
  const started = deferred<void>();
  let calls = 0;
  const cache = createReceivedMediaCache({
    files: {
      ...media.files,
      download: async (url, path, progress, signal) => {
        if (++calls === 1) {
          started.resolve();
          await new Promise<void>((_resolve, reject) => {
            signal?.addEventListener("abort", () => reject(new Error("Download aborted")), {
              once: true,
            });
          });
        }
        await media.files.download(url, path, progress, signal);
      },
    },
    storage: createResourceStorage(data.adapter),
  });
  const first = cache.receive("studio", packet());
  await started.promise;
  await cache.purge("studio");
  expect(await first).toBeUndefined();
  const restored = await cache.receive("studio", packet());
  expect(restored?.record.resourceId).toBe("fanfare");
  expect(calls).toBe(2);
  expect(await media.files.exists("studio/audio-1.mp3")).toBe(true);
});

test("invalid saved paths and malformed media fail before a download or index write", async () => {
  const valid = receivedMediaRecord("studio", packet(), 1);
  for (const clipPath of [
    "../secret.mp3",
    "studio/../../secret",
    "%2e%2e/file.mp3",
    "studio/%2Fsecret.mp3",
    "file:///private/secret",
    "studio/invalid%path",
  ])
    expect(() =>
      decodeMediaLibrary(JSON.stringify({ studio: [{ ...valid, clipPath }] })),
    ).toThrow();
  const data = memory();
  const media = await disk();
  const cache = createReceivedMediaCache({
    files: media.files,
    storage: createResourceStorage(data.adapter),
  });
  for (const incoming of [
    { ...packet(), version: "bad" },
    { ...packet(), volume: NaN },
    { ...packet(), offsetMs: -1 },
    { ...packet(), audio: { ...packet().audio, downloadUrl: "file:///private/secret" } },
  ])
    expect(() => cache.receive("studio", incoming)).toThrow();
  expect(media.downloads).toEqual([]);
  expect(data.writes).toEqual([]);
});

test("mixed hydration keeps the newest resource version and accepts source legacy empty versions", async () => {
  const first = receivedMediaRecord("studio", packet(), 1);
  const next: ICachedMedia = { ...first, version: "", receivedAt: 2, name: "Newest" };
  const library = decodeMediaLibrary(JSON.stringify({ studio: [next, first] }));
  expect(library.studio).toEqual([next]);
  const data = memory(JSON.stringify(library));
  const storage = createResourceStorage(data.adapter);
  await storage.update((current) => purgeCachedConnection(current, "studio"));
  expect(decodeMediaLibrary(data.read())).toEqual({});
});
