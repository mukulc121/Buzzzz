import { expect, test } from "bun:test";
import { emptyPattern, type Msg, type Pattern } from "@buzzzz/core";
import { createReceivedLibrary } from "../src/features/sessionLibrary/receivedLibrary";
import { createResourceStorage } from "../src/features/sessionLibrary/resourceStorage";
import { receivedPatternRecord } from "../src/features/sessionLibrary/receivedPattern";

function packet(resourceId: string, name = resourceId): Extract<Msg, { type: "haptic-preset" }> {
  return {
    type: "haptic-preset",
    resourceId,
    name,
    version: "a".repeat(64),
    pattern: {
      ...emptyPattern(),
      discretePattern: [{ time: 1000, amplitude: 0.6436, frequency: 0.25 }],
    },
  };
}

function setup() {
  let value: string | null = null;
  let time = 1;
  let failure: Error | undefined;
  const native: { parsed: Pattern[]; plays: number; stops: number } = {
    parsed: [],
    plays: 0,
    stops: 0,
  };
  const adapter = {
    getItem: async (_key: string) => value,
    setItem: async (_key: string, next: string) => {
      if (failure) throw failure;
      value = next;
    },
  };
  const options = {
    storage: createResourceStorage(adapter),
    composer: {
      parse: (pattern: Pattern) => {
        native.parsed.push(pattern);
      },
      play: () => {
        native.plays++;
      },
      stop: () => {
        native.stops++;
      },
    },
    now: () => time++,
    requestFrame: (_callback: () => void) => 1,
    cancelFrame: (_id: number) => {},
  };
  return {
    native,
    options,
    adapter,
    fail: (error?: Error) => {
      failure = error;
    },
  };
}

function delayedLibrary() {
  const data = setup();
  let release: (value: string | null) => void = () => {};
  const read = new Promise<string | null>((resolve) => {
    release = resolve;
  });
  const library = {
    "studio-a": [receivedPatternRecord(packet("a"), 1)],
    "studio-b": [receivedPatternRecord(packet("b"), 2)],
  };
  const storage = createResourceStorage({ ...data.adapter, getItem: async () => read });
  return {
    ...data,
    controller: createReceivedLibrary({ ...data.options, storage }),
    release: () => release(JSON.stringify(library)),
  };
}

test("receiving plays immediately, saves a stable snapshot and reopens for offline replay", async () => {
  const data = setup();
  const controller = createReceivedLibrary(data.options);
  const incoming = packet("hit", "Studio Hit");
  const receipt = controller.receive("studio-a", incoming);
  expect(data.native.plays).toBe(1);
  expect(controller.getSnapshot().active).toMatchObject({
    connectionId: "studio-a",
    record: { resourceId: "hit", name: "Studio Hit" },
  });
  await receipt;
  incoming.pattern.discretePattern[0].amplitude = 0;
  expect(controller.getSnapshot().active?.record.pattern.discretePattern[0].amplitude).toBe(0.6436);
  controller.dispose();
  const reopened = createReceivedLibrary({
    ...data.options,
    storage: createResourceStorage(data.adapter),
  });
  await reopened.hydrate();
  expect(reopened.getSnapshot()).toMatchObject({ active: null, playing: false, hydrated: true });
  await reopened.play("studio-a", "hit");
  expect(data.native.plays).toBe(2);
  expect(data.native.parsed.at(-1)?.discretePattern[0].amplitude).toBe(0.6436);
  expect(reopened.getSnapshot().library["studio-a"][0].name).toBe("Studio Hit");
});

test("manifests rename only saved IDs in their connection and update an active name without replay", async () => {
  const data = setup();
  const controller = createReceivedLibrary(data.options);
  await controller.receive("studio-a", packet("same", "First Studio"));
  await controller.receive("studio-b", packet("same", "Other Studio"));
  await controller.manifest("studio-a", [
    { resourceId: "same", name: "Renamed" },
    { resourceId: "new", name: "No download" },
  ]);
  expect(controller.getSnapshot().library["studio-a"].map((record) => record.name)).toEqual([
    "Renamed",
  ]);
  expect(controller.getSnapshot().active?.record.name).toBe("Other Studio");
  await controller.manifest("studio-b", [{ resourceId: "same", name: "Other renamed" }]);
  expect(controller.getSnapshot().active?.record.name).toBe("Other renamed");
  await controller.manifest("studio-b", []);
  expect(controller.getSnapshot().library["studio-b"]).toHaveLength(1);
  expect(data.native.plays).toBe(2);
});

test("deletion and purge dismiss only their matching session and preserve other cached studios", async () => {
  const data = setup();
  const controller = createReceivedLibrary(data.options);
  await controller.receive("studio-a", packet("same"));
  await controller.receive("studio-b", packet("same"));
  await controller.remove("studio-a", "same");
  expect(controller.getSnapshot().active?.connectionId).toBe("studio-b");
  await controller.receive("studio-a", packet("kept"));
  await controller.purge("studio-b");
  expect(controller.getSnapshot().active?.connectionId).toBe("studio-a");
  expect(Object.hasOwn(controller.getSnapshot().library, "studio-b")).toBe(false);
  await controller.remove("studio-a", "kept");
  expect(controller.getSnapshot()).toMatchObject({ active: null, playing: false, positionMs: 0 });
  expect(controller.getSnapshot().library["studio-a"]).toEqual([]);
});

test("storage failures reject and surface an error without pretending a received pattern was saved", async () => {
  const data = setup();
  const controller = createReceivedLibrary(data.options);
  await controller.receive("studio", packet("saved"));
  data.fail(new Error("Storage is full"));
  await expect(controller.receive("studio", packet("unsaved"))).rejects.toThrow("Storage is full");
  expect(controller.getSnapshot()).toMatchObject({
    error: null,
    storageError: "Storage is full",
    playing: true,
  });
  expect(controller.getSnapshot().library.studio.map((record) => record.resourceId)).toEqual([
    "saved",
  ]);
  expect(controller.getSnapshot().active?.record.resourceId).toBe("unsaved");
  controller.pause();
  expect(controller.getSnapshot().playing).toBe(false);
  controller.togglePlay();
  expect(controller.getSnapshot()).toMatchObject({
    playing: true,
    error: null,
    storageError: "Storage is full",
  });
  data.fail();
  await controller.receive("studio", packet("retried"));
  expect(controller.getSnapshot()).toMatchObject({ error: null, storageError: null });
  expect(controller.getSnapshot().library.studio.map((record) => record.resourceId)).toEqual([
    "retried",
    "saved",
  ]);
});

test("unmounted hydration never publishes state or starts playback, and a later mount can hydrate", async () => {
  const data = setup();
  let resolveRead: (value: string | null) => void = () => {};
  const delayedRead = new Promise<string | null>((resolve) => {
    resolveRead = resolve;
  });
  const storage = createResourceStorage({
    ...data.adapter,
    getItem: async () => delayedRead,
  });
  const controller = createReceivedLibrary({ ...data.options, storage });
  let updates = 0;
  controller.subscribe(() => {
    updates++;
  });
  const hydration = controller.hydrate();
  controller.dispose();
  resolveRead(null);
  await hydration;
  expect(updates).toBe(0);
  expect(data.native.plays).toBe(0);
  controller.activate();
  await controller.hydrate();
  expect(controller.getSnapshot()).toMatchObject({ hydrated: true, library: {}, active: null });
});

test("saving and native playback failures remain independent", async () => {
  const data = setup();
  data.options.composer.parse = () => {
    throw new Error("Native parse failed");
  };
  data.fail(new Error("Storage is full"));
  const controller = createReceivedLibrary(data.options);
  await expect(controller.receive("studio", packet("hit"))).rejects.toThrow("Storage is full");
  expect(controller.getSnapshot()).toMatchObject({
    playing: false,
    error: "Native parse failed",
    storageError: "Storage is full",
  });
  data.fail();
  await controller.hydrate();
  expect(controller.getSnapshot()).toMatchObject({
    playing: false,
    error: "Native parse failed",
    storageError: null,
  });
});

test("manual controls and matching deletion cancel a local play still waiting for storage", async () => {
  for (const action of [
    "stop",
    "pause",
    "dismiss",
    "togglePlay",
    "seek",
    "remove",
    "purge",
  ] as const) {
    const data = delayedLibrary();
    const pending = data.controller.play("studio-a", "a");
    let mutation: Promise<void> | undefined;
    if (action === "remove") mutation = data.controller.remove("studio-a", "a");
    else if (action === "purge") mutation = data.controller.purge("studio-a");
    else if (action === "seek") data.controller.seek(200);
    else data.controller[action]();
    data.release();
    await pending;
    await mutation;
    expect(data.native.plays, action).toBe(0);
    expect(data.controller.getSnapshot().playing, action).toBe(false);
  }
});

test("the latest local selection wins deferred hydration and a new receipt cancels an older selection", async () => {
  const local = delayedLibrary();
  const first = local.controller.play("studio-a", "a");
  const latest = local.controller.play("studio-b", "b");
  local.release();
  await Promise.all([first, latest]);
  expect(local.native.plays).toBe(1);
  expect(local.controller.getSnapshot().active?.connectionId).toBe("studio-b");
  const incoming = delayedLibrary();
  const oldSelection = incoming.controller.play("studio-a", "a");
  const receipt = incoming.controller.receive("studio-c", packet("c"));
  expect(incoming.native.plays).toBe(1);
  incoming.release();
  await Promise.all([oldSelection, receipt]);
  expect(incoming.native.plays).toBe(1);
  expect(incoming.controller.getSnapshot().active?.connectionId).toBe("studio-c");
  expect(incoming.controller.getSnapshot().library["studio-c"][0].resourceId).toBe("c");
});

test("deleting another connection's same resource ID does not cancel a pending local selection", async () => {
  const data = delayedLibrary();
  const pending = data.controller.play("studio-a", "a");
  const removal = data.controller.remove("studio-b", "a");
  data.release();
  await Promise.all([pending, removal]);
  expect(data.native.plays).toBe(1);
  expect(data.controller.getSnapshot().active?.connectionId).toBe("studio-a");
});
