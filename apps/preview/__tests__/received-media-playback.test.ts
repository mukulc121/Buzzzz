import { expect, test } from "bun:test";
import { emptyPattern, parseMessage, type Msg } from "@buzzzz/core";
import type { Pattern } from "react-native-pulsar";
import { createReceivedLibrary } from "../src/features/sessionLibrary/receivedLibrary";
import { createResourceStorage } from "../src/features/sessionLibrary/resourceStorage";
import { validateMediaDownload } from "../src/features/sessionLibrary/mediaDownload";
import {
  mediaStatusText,
  resourceKindIcon,
  resourceKindLabel,
} from "../src/features/sessionLibrary/mediaStatus";
import { patternStartingAt } from "../src/features/sessionLibrary/patternStartingAt";
import golden from "./fixtures/published-sound-seek.json";
import {
  isReceivedResourceMessage,
  stopLegacyFromBrowser,
} from "../src/features/sessionLibrary/browserCommands";

type Audio = Extract<Msg, { type: "audio-haptics" }>;
const room = "a".repeat(32);
const relay = `wss://studio.example/relay?room=${room}&token=${"p".repeat(43)}`;
function audio(resourceId = "fanfare", clipId = "clip-a"): Audio {
  return {
    type: "audio-haptics",
    resourceId,
    name: "FanfareSound",
    version: "b".repeat(64),
    durationMs: 5187,
    pattern: {
      ...emptyPattern(),
      discretePattern: [{ time: 1000, amplitude: 0.7, frequency: 0.5 }],
    },
    audio: {
      clipId,
      downloadUrl: `https://studio.example/v1/rooms/${room}/assets/${"b".repeat(32)}.bin?token=${"s".repeat(43)}`,
      contentType: "audio/mpeg",
      size: 94080,
    },
    volume: 0,
    offsetMs: 500,
    window: { startMs: 200, durationMs: 4704 },
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function fixture() {
  let stored: string | null = null;
  let time = 100;
  const disk = {
    getItem: async (_key: string) => stored,
    setItem: async (_key: string, value: string) => {
      stored = value;
    },
  };
  const paths = new Set<string>();
  const downloads: string[] = [];
  const parsed: Pattern[] = [];
  const opened: string[] = [];
  const started = deferred<void>();
  let gate: Promise<void> | undefined;
  let plays = 0;
  let sequence = 0;
  const frames = new Map<number, () => void>();
  const files = {
    uri: (path: string) => `file:///Documents/pulsar-media/${path}`,
    exists: async (path: string) => paths.has(path),
    download: async (url: string, path: string, progress?: (value: number) => void) => {
      downloads.push(url);
      progress?.(0.25);
      started.resolve();
      await gate;
      paths.add(path);
      progress?.(1);
    },
    remove: async (path: string) => {
      paths.delete(path);
    },
    purge: async (id: string) => {
      for (const path of paths) if (path.startsWith(`${id}/`)) paths.delete(path);
    },
  };
  const options = {
    storage: createResourceStorage(disk),
    files,
    composer: {
      parse: (pattern: Pattern) => {
        parsed.push(pattern);
      },
      play: () => {
        plays++;
      },
      stop: () => {},
    },
    now: () => time,
    requestFrame: (callback: () => void) => {
      frames.set(++sequence, callback);
      return sequence;
    },
    cancelFrame: (id: number) => {
      frames.delete(id);
    },
    onReceive: (id: string) => {
      opened.push(id);
    },
  };
  const controller = createReceivedLibrary(options);
  return {
    controller,
    options,
    disk,
    files,
    paths,
    downloads,
    parsed,
    opened,
    started: started.promise,
    hold: (promise: Promise<void>) => {
      gate = promise;
    },
    plays: () => plays,
    tick: (at: number) => {
      time = at;
      const pending = [...frames.values()];
      frames.clear();
      for (const callback of pending) callback();
    },
  };
}

test("published sound seek branch golden cases retain offset, explicit silence and the EOF sentinel", () => {
  for (const value of golden.cases) {
    const pattern = { ...emptyPattern(), sound: value.sound };
    expect(patternStartingAt(pattern, value.time).sound).toEqual(value.expected);
    expect(patternStartingAt(pattern, 0)).toBe(pattern);
  }
});

test("received audio downloads before native parsing and replays from local storage without network", async () => {
  const run = fixture();
  const gate = deferred<void>();
  run.hold(gate.promise);
  const receipt = run.controller.receive("studio", audio(), relay);
  await run.started;
  expect(run.controller.getSnapshot()).toMatchObject({
    downloading: true,
    downloadProgress: 0.25,
    playing: false,
  });
  expect(run.plays()).toBe(0);
  expect(run.opened).toEqual(["studio"]);
  gate.resolve();
  await receipt;
  expect(run.controller.getSnapshot()).toMatchObject({
    downloading: false,
    playing: true,
    active: { record: { kind: "audio" }, clipMissing: false },
  });
  expect(run.parsed.at(-1)?.sound).toEqual({
    uri: "file:///Documents/pulsar-media/studio/clip-a.mp3",
    volume: 0,
    offset: 500,
    start: 200,
    duration: 4704,
  });
  run.controller.dispose();
  const offline = createReceivedLibrary({
    ...run.options,
    storage: createResourceStorage(run.disk),
    files: {
      ...run.files,
      download: async () => {
        throw new Error("offline");
      },
    },
    request: async () => {
      throw new Error("offline");
    },
  });
  await offline.play("studio", "fanfare");
  expect(offline.getSnapshot().playing).toBe(true);
  expect(run.downloads).toHaveLength(1);
  offline.seek(600);
  expect(run.parsed.at(-1)?.sound).toMatchObject({
    volume: 0,
    offset: 500,
    start: 800,
    duration: 4104,
  });
  offline.pause();
  offline.seek(300);
  offline.togglePlay();
  expect(run.parsed.at(-1)?.sound).toMatchObject({ start: 500, duration: 4404 });
});

test("animation keeps actual metadata and uses haptics plus the local animation URI", async () => {
  const run = fixture();
  const base = audio();
  const packet: Extract<Msg, { type: "animation-haptics" }> = {
    ...base,
    type: "animation-haptics",
    animation: {
      ...base.audio,
      contentType: "application/json",
      totalFrames: 140,
      frameRate: 60.000002092634,
      width: 1000,
      height: 1000,
    },
  };
  await run.controller.receive("studio", packet, relay);
  expect(run.controller.getSnapshot().active).toMatchObject({
    record: {
      kind: "animation",
      animation: { totalFrames: 140, frameRate: 60.000002092634, width: 1000, height: 1000 },
    },
    localUri: "file:///Documents/pulsar-media/studio/clip-a.json",
  });
  expect(run.parsed.at(-1)?.sound).toBeUndefined();
  run.tick(1100);
  expect(run.controller.getSnapshot().positionMs).toBe(1000);
  expect(resourceKindLabel("animation")).toBe("Animation");
  expect(resourceKindIcon("animation")).toBe("sparkles");
});

test("a missing cached clip replays haptics only without trying a download", async () => {
  const run = fixture();
  await run.controller.receive("studio", audio(), relay);
  await run.files.remove("studio/clip-a.mp3");
  await run.controller.play("studio", "fanfare");
  expect(run.controller.getSnapshot().active?.clipMissing).toBe(true);
  expect(run.parsed.at(-1)?.sound).toBeUndefined();
  expect(run.downloads).toHaveLength(1);
});

test("manual stop during download permits persistence and replay without late automatic playback", async () => {
  const run = fixture();
  const gate = deferred<void>();
  run.hold(gate.promise);
  const receipt = run.controller.receive("studio", audio(), relay);
  await run.started;
  run.controller.stop();
  gate.resolve();
  await receipt;
  expect(run.plays()).toBe(0);
  expect(run.controller.getSnapshot()).toMatchObject({
    downloading: false,
    playing: false,
    active: { localUri: "file:///Documents/pulsar-media/studio/clip-a.mp3" },
  });
  run.controller.togglePlay();
  expect(run.plays()).toBe(1);
});

test("remove and purge during a download cannot resurrect or play the deleted resource", async () => {
  for (const operation of ["remove", "purge"] as const) {
    const run = fixture();
    const gate = deferred<void>();
    run.hold(gate.promise);
    const receipt = run.controller.receive("studio", audio(), relay);
    await run.started;
    const removing =
      operation === "remove"
        ? run.controller.remove("studio", "fanfare")
        : run.controller.purge("studio");
    gate.resolve();
    await Promise.all([receipt, removing]);
    expect(run.plays()).toBe(0);
    expect(run.controller.getSnapshot().active).toBeNull();
    expect(run.controller.getSnapshot().library.studio ?? []).toEqual([]);
    expect(run.paths.size).toBe(0);
  }
});

test("only the latest received preset owns playback while older downloads may finish saving", async () => {
  const run = fixture();
  const gate = deferred<void>();
  run.hold(gate.promise);
  const first = run.controller.receive("studio", audio("first"), relay);
  await run.started;
  const second = run.controller.receive("studio", audio("second", "clip-b"), relay);
  gate.resolve();
  await Promise.all([first, second]);
  expect(run.plays()).toBe(1);
  expect(run.controller.getSnapshot().active?.record.resourceId).toBe("second");
  expect(run.controller.getSnapshot().library.studio).toHaveLength(2);
});

test("a stalled other connection and its purge cannot hold or interrupt a ready received session", async () => {
  const run = fixture();
  const gate = deferred<void>();
  const started = deferred<void>();
  const controller = createReceivedLibrary({
    ...run.options,
    files: {
      ...run.files,
      download: async (url, path, progress) => {
        if (path.startsWith("blocked/")) {
          started.resolve();
          await gate.promise;
        }
        await run.files.download(url, path, progress);
      },
    },
  });
  const blocked = controller.receive("blocked", audio(), relay);
  await started.promise;
  try {
    await controller.receive("ready", audio(), relay);
    await controller.purge("blocked");
    expect(controller.getSnapshot()).toMatchObject({
      downloading: false,
      playing: true,
      active: { connectionId: "ready" },
    });
  } finally {
    gate.resolve();
    await blocked;
  }
  expect(controller.getSnapshot().active?.connectionId).toBe("ready");
  expect(controller.getSnapshot().library.blocked).toBeUndefined();
  expect(run.plays()).toBe(1);
}, 2000);

test("concurrent revisions of the same resource preserve arrival order and play only the latest", async () => {
  const run = fixture();
  const gate = deferred<void>();
  run.hold(gate.promise);
  const first = run.controller.receive("studio", audio("fanfare", "first"), relay);
  const second = run.controller.receive(
    "studio",
    { ...audio("fanfare", "second"), name: "Revised" },
    relay,
  );
  await run.started;
  gate.resolve();
  await Promise.all([first, second]);
  expect(run.plays()).toBe(1);
  expect(run.controller.getSnapshot().active?.record.name).toBe("Revised");
  expect(run.controller.getSnapshot().library.studio).toHaveLength(1);
  expect(run.parsed.at(-1)?.sound?.uri).toEndWith("/second.mp3");
});

test("an invalid media packet cannot cancel a valid download or its automatic playback", async () => {
  const run = fixture();
  const gate = deferred<void>();
  run.hold(gate.promise);
  const first = run.controller.receive("studio", audio(), relay);
  await run.started;
  const invalid = audio();
  invalid.audio.downloadUrl = invalid.audio.downloadUrl.replace(
    "studio.example",
    "foreign.example",
  );
  await expect(run.controller.receive("studio", invalid, relay)).rejects.toThrow("does not belong");
  gate.resolve();
  await first;
  expect(run.plays()).toBe(1);
  expect(run.controller.getSnapshot()).toMatchObject({ downloading: false, playing: true });
  expect(run.downloads).toHaveLength(1);
});

test("a delayed older session validation cannot replace a newer receipt", async () => {
  const run = fixture();
  const lookup = deferred<Response>();
  const controller = createReceivedLibrary({ ...run.options, request: async () => lookup.promise });
  const first = controller.receive("studio", audio("fanfare", "old"), "wss://studio.example/relay");
  await controller.receive("studio", { ...audio("fanfare", "new"), name: "Current" }, relay);
  lookup.resolve(Response.json({ roomId: room }));
  await first;
  expect(run.plays()).toBe(1);
  expect(controller.getSnapshot().active?.record.name).toBe("Current");
  expect(run.downloads).toHaveLength(1);
  expect(run.parsed.at(-1)?.sound?.uri).toEndWith("/new.mp3");
});

test("a later plain pattern replaces pending audio and removes its obsolete local clip", async () => {
  const run = fixture();
  const gate = deferred<void>();
  run.hold(gate.promise);
  const incoming = audio();
  const first = run.controller.receive("studio", incoming, relay);
  await run.started;
  const plain = run.controller.receive("studio", {
    type: "haptic-preset",
    resourceId: incoming.resourceId,
    name: "Haptics only",
    version: "c".repeat(64),
    pattern: incoming.pattern,
  });
  expect(run.plays()).toBe(1);
  gate.resolve();
  await Promise.all([first, plain]);
  expect(run.plays()).toBe(1);
  expect(run.controller.getSnapshot().library.studio[0].kind).toBe("pattern");
  expect(run.paths.size).toBe(0);
});

test("unmounted downloads can save but cannot publish, reopen the modal or play", async () => {
  const run = fixture();
  const gate = deferred<void>();
  run.hold(gate.promise);
  const receipt = run.controller.receive("studio", audio(), relay);
  await run.started;
  let notifications = 0;
  run.controller.subscribe(() => {
    notifications++;
  });
  run.controller.dispose();
  const before = notifications;
  gate.resolve();
  await receipt;
  expect(run.plays()).toBe(0);
  expect(notifications).toBe(before);
  expect((await createResourceStorage(run.disk).load()).studio[0].kind).toBe("audio");
});

test("foreign origin or room and malformed signed addresses reject before touching files", async () => {
  const run = fixture();
  const original = audio();
  for (const downloadUrl of [
    original.audio.downloadUrl.replace("studio.example", "foreign.example"),
    original.audio.downloadUrl.replace(room, "d".repeat(32)),
    "https://studio.example/arbitrary.mp3",
  ]) {
    await expect(
      run.controller.receive(
        "studio",
        { ...original, audio: { ...original.audio, downloadUrl } },
        relay,
      ),
    ).rejects.toThrow();
  }
  expect(run.downloads).toEqual([]);
  expect(run.opened).toEqual([]);
  expect(run.plays()).toBe(0);
  await validateMediaDownload(original, relay);
});

test("legacy LAN bindings come from the trusted server session and are verified again after restart", async () => {
  const base = audio();
  const packet = {
    ...base,
    audio: {
      ...base.audio,
      downloadUrl: base.audio.downloadUrl.replace(
        "https://studio.example",
        "http://192.168.1.2:5173",
      ),
    },
  };
  const requests: { address: string; redirect?: RequestRedirect }[] = [];
  let roomId = room;
  const request = async (input: URL, init?: RequestInit) => {
    requests.push({ address: input.href, redirect: init?.redirect });
    return Response.json({ roomId });
  };
  await validateMediaDownload(packet, "ws://192.168.1.2:5173/relay?role=phone", request);
  roomId = "e".repeat(32);
  await expect(
    validateMediaDownload(packet, "ws://192.168.1.2:5173/relay?role=phone", request),
  ).rejects.toThrow("does not belong");
  expect(requests).toEqual([
    { address: "http://192.168.1.2:5173/media/session", redirect: "error" },
    { address: "http://192.168.1.2:5173/media/session", redirect: "error" },
  ]);
  await expect(
    validateMediaDownload(
      packet,
      "ws://192.168.1.2:5173/relay",
      async () => new Response("unavailable", { status: 503 }),
    ),
  ).rejects.toThrow("could not be verified");
});

test("removing a connection during LAN session verification prevents the later download", async () => {
  const run = fixture();
  const lookup = deferred<Response>();
  const querying = deferred<void>();
  const controller = createReceivedLibrary({
    ...run.options,
    request: async () => {
      querying.resolve();
      return lookup.promise;
    },
  });
  const base = audio();
  const packet = {
    ...base,
    audio: {
      ...base.audio,
      downloadUrl: base.audio.downloadUrl.replace(
        "https://studio.example",
        "http://192.168.1.2:5173",
      ),
    },
  };
  const receiving = controller.receive("studio", packet, "ws://192.168.1.2:5173/relay");
  await querying.promise;
  await controller.purge("studio");
  lookup.resolve(Response.json({ roomId: room }));
  await receiving;
  expect(run.downloads).toEqual([]);
  expect(controller.getSnapshot().active).toBeNull();
});

test("download status uses the published percentage text and audio row labels", () => {
  expect(mediaStatusText(null, 0, true, 0.256, null)).toBe("Downloading… 26%");
  expect(resourceKindLabel("audio")).toBe("Audio");
  expect(resourceKindIcon("audio")).toBe("play");
});

test("browser Stop targets its legacy owner and leaves received audio independent during and after download", async () => {
  const run = fixture();
  const gate = deferred<void>();
  run.hold(gate.promise);
  let legacyOwner: string | null = null;
  let legacyStops = 0;
  const dispatch = (data: string) => {
    const message = parseMessage(data);
    if (!message) throw new Error("Invalid test message");
    if (isReceivedResourceMessage(message)) return run.controller.receive("studio", message, relay);
    if (message.type === "stop")
      stopLegacyFromBrowser(legacyOwner, "studio", () => {
        legacyStops++;
      });
  };
  const receiving = dispatch(JSON.stringify(audio()));
  await run.started;
  dispatch(JSON.stringify({ type: "stop" }));
  expect(run.controller.getSnapshot().downloading).toBe(true);
  expect(legacyStops).toBe(0);
  gate.resolve();
  await receiving;
  dispatch(JSON.stringify({ type: "stop" }));
  expect(run.controller.getSnapshot().playing).toBe(true);
  expect(run.plays()).toBe(1);
  legacyOwner = "other";
  dispatch(JSON.stringify({ type: "stop" }));
  expect(legacyStops).toBe(0);
  legacyOwner = "studio";
  dispatch(JSON.stringify({ type: "stop" }));
  expect(legacyStops).toBe(1);
  expect(run.controller.getSnapshot().playing).toBe(true);
});
