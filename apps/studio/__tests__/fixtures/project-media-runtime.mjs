import assert from "node:assert/strict";
import { mock } from "bun:test";
import { parentPort, workerData } from "node:worker_threads";

const slots = [];
let cursor = 0;
const render = (body) => {
  cursor = 0;
  return body();
};
mock.module("react", () => ({
  useRef: (current) => {
    const index = cursor++;
    return (slots[index] ??= { current });
  },
  useState: (initial) => {
    const index = cursor++;
    if (!(index in slots)) slots[index] = typeof initial === "function" ? initial() : initial;
    return [
      slots[index],
      (next) => {
        slots[index] = typeof next === "function" ? next(slots[index]) : next;
      },
    ];
  },
  useMemo: (body) => body(),
  useCallback: (body) => body,
  useLayoutEffect: (body) => body(),
  useEffect: () => {},
}));

const tables = { items: new Map(), blobs: new Map(), attachments: new Map() };
const keyOf = (name, item) =>
  name === "attachments" ? [item.projectId, item.scope, item.kind] : item.id;
const tableKey = (key) => JSON.stringify(key);
const store = (name) => ({
  get: (key) => tables[name].get(tableKey(key)),
  delete: (key) => tables[name].delete(tableKey(key)),
  put: (item) => tables[name].set(tableKey(keyOf(name, item)), item),
  add: (item) => {
    const key = tableKey(keyOf(name, item));
    if (tables[name].has(key)) throw new DOMException("Already attached", "ConstraintError");
    tables[name].set(key, item);
  },
  index: (index) => {
    const matches = (value) =>
      [...tables[name].values()].filter(
        (item) =>
          tableKey(index === "projectScope" ? [item.projectId, item.scope] : item[index]) ===
          tableKey(value),
      );
    return {
      getAll: matches,
      getAllKeys: (value) => matches(value).map((item) => keyOf(name, item)),
      count: (value) => matches(value).length,
    };
  },
});
let holdReads = null;
let reads = 0;
let notifyRead = () => {};
mock.module("../../src/features/media/db.ts", () => ({
  settle: async (value) => value,
  transact: async (names, mode, body) => {
    if (mode === "readonly" && names.includes("blobs")) {
      reads++;
      notifyRead();
      await holdReads;
    }
    return body({ objectStore: store });
  },
}));

const data = new Map();
globalThis.localStorage = {
  get length() {
    return data.size;
  },
  key: (index) => [...data.keys()][index] ?? null,
  getItem: (key) => data.get(key) ?? null,
  setItem: (key, value) => data.set(key, value),
  removeItem: (key) => data.delete(key),
};

const { starterProject, newRecord } = await import("../../src/features/project/model.ts");
const repository = await import("../../src/features/project/repository.ts");
const media = await import("../../src/features/media/repository.ts");
const { copyPresetMedia } = await import("../../src/features/project/mediaTransfer.ts");
const { useProjectDocument } = await import("../../src/features/project/useProjectDocument.ts");
const { useProjectCatalog } = await import("../../src/features/project/useProjectCatalog.ts");
const { useMediaLibrary } = await import("../../src/features/media/useMediaLibrary.ts");
const { useAttachedTracks } = await import("../../src/features/media/useAttachedTracks.ts");
const file = new File(["synthetic test audio"], "test.wav", { type: "audio/wav" });
const source = newRecord("Source", starterProject());
source.id = "source";
source.project.presets[0].id = "copied";
const target = newRecord("Target", starterProject());
target.id = "target";
target.project.presets[0].id = "original";
const other = newRecord("Other", starterProject());
other.id = "other";
for (const record of [source, target, other]) assert.equal(repository.writeRecord(record), null);
const sourceAsset = await media.addMedia({ projectId: source.id, file, kind: "audio" });
await media.attachMedia({ projectId: source.id, presetId: "copied", assetId: sourceAsset.id });

let activeId = "elsewhere";
let ownsActive = true;
let document;
let catalog;
const errors = [];
const renderCatalog = () =>
  render(() => {
    document = useProjectDocument({
      initial: target.project,
      writable: ownsActive,
      onCommit: () => {},
    });
    catalog = useProjectCatalog({
      activeId,
      ownsActive,
      document,
      switchTo: () => {},
      persist: () => true,
      setStorageError: (message) => {
        if (message) errors.push(message);
      },
    });
  });
const pauseMedia = () => {
  let release;
  holdReads = new Promise((resolve) => {
    release = resolve;
  });
  const started = new Promise((resolve) => {
    notifyRead = resolve;
  });
  return { started, release };
};

const scenario = workerData ?? process.argv[2];
const held = new Set(scenario === "locked-target" ? ["buzzzz-project:target"] : []);
Object.defineProperty(globalThis, "navigator", {
  configurable: true,
  value: {
    locks: {
      request: async (name, options, callback) => {
        const task = typeof options === "function" ? options : callback;
        if (held.has(name)) {
          assert.equal(options.ifAvailable, true);
          return task(null);
        }
        held.add(name);
        try {
          return await task({ name });
        } finally {
          held.delete(name);
        }
      },
    },
  },
});
if (scenario.startsWith("duplicate")) {
  activeId = "source";
  target.project = structuredClone(source.project);
  target.project.presets[0].editor = {
    markers: [{ id: "marker", time: 500, label: "Hit" }],
    range: { start: 100, end: 1000 },
    durationMs: 5187,
  };
  await media.setMediaTrim({
    projectId: "source",
    presetId: "copied",
    kind: "audio",
    trim: { startMs: 20, endMs: 200 },
  });
  const animation = await media.addMedia({
    projectId: "source",
    file: new File(["{}"], "test.json", { type: "application/json" }),
    kind: "animation",
  });
  await media.attachMedia({ projectId: "source", presetId: "copied", assetId: animation.id });
  const original = structuredClone(target.project.presets[0]);
  if (scenario === "duplicate-read-only") ownsActive = false;
  renderCatalog();
  const duplicate = catalog.api.duplicatePreset;
  if (scenario === "duplicate-stale") {
    activeId = "other";
    renderCatalog();
  }
  const pause =
    scenario === "duplicate-switch" || scenario === "duplicate-takeover" ? pauseMedia() : null;
  const pending = duplicate("copied");
  if (pause) {
    await pause.started;
    if (scenario === "duplicate-switch") activeId = "other";
    else ownsActive = false;
    renderCatalog();
    pause.release();
  }
  const second = scenario === "duplicate-concurrent" ? catalog.api.duplicatePreset("copied") : null;
  const id = await pending;
  const secondId = second ? await second : null;
  renderCatalog();
  assert.deepEqual(document.project.presets[0], original);
  if (scenario === "duplicate" || scenario === "duplicate-concurrent") {
    assert.equal(typeof id, "string");
    const copy = document.project.presets.find((preset) => preset.id === id);
    assert.equal(copy.name, "Thud copy");
    assert.deepEqual(copy.pattern, original.pattern);
    assert.deepEqual(copy.editor.range, original.editor.range);
    assert.equal(copy.editor.durationMs, original.editor.durationMs);
    assert.notEqual(copy.editor.markers[0].id, original.editor.markers[0].id);
    assert.equal(copy.editor.markers[0].label, "Hit");
    const attachments = await media.listAttachments("source", id);
    assert.deepEqual(
      attachments.map(({ kind, assetId, trim }) => ({ kind, assetId, trim })),
      (await media.listAttachments("source", "copied")).map(({ kind, assetId, trim }) => ({
        kind,
        assetId,
        trim,
      })),
    );
    assert.equal((await media.listMedia("source")).length, 2);
    if (second) {
      assert.notEqual(secondId, id);
      assert.equal(document.project.presets.length, 3);
    }
  } else {
    assert.equal(id, null);
    assert.equal(document.project.presets.length, 1);
    const attachments = [...tables.attachments.values()].filter(
      (item) => item.projectId === "source",
    );
    assert.equal(attachments.length, 2);
    assert.equal((await media.listMedia("source")).length, 2);
    if (scenario === "duplicate-read-only" || scenario === "duplicate-stale")
      assert.equal(reads, 0);
  }
} else if (scenario === "concurrent" || scenario === "active-concurrent") {
  if (scenario === "active-concurrent") activeId = "target";
  const pause = pauseMedia();
  renderCatalog();
  const first = catalog.api.copyPattern("source", "copied", "target");
  await pause.started;
  assert.equal(held.has("buzzzz-copy:target"), true);
  assert.equal(held.has("buzzzz-project:target"), scenario === "concurrent");
  const second = catalog.api.copyPattern("source", "copied", "target");
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(reads, 1, "the second copy must wait before touching media");
  pause.release();
  assert.deepEqual(await Promise.all([first, second]), [true, true]);
  renderCatalog();
  const copied = (
    scenario === "active-concurrent" ? document.project : repository.readRecord("target").project
  ).presets.slice(1);
  assert.equal(copied.length, 2);
  assert.equal(new Set(copied.map((preset) => preset.id)).size, 2);
  for (const preset of copied)
    assert.equal((await media.listAttachments("target", preset.id)).length, 1);
  assert.equal((await media.listMedia("target")).length, 1);
  assert.equal(held.size, 0);
} else if (scenario === "switch" || scenario === "takeover") {
  activeId = "target";
  const pause = pauseMedia();
  renderCatalog();
  const pending = catalog.api.copyPattern("source", "copied", "target");
  await pause.started;
  if (scenario === "switch") {
    document.reset(other.project);
    activeId = "other";
  } else ownsActive = false;
  renderCatalog();
  pause.release();
  assert.equal(await pending, false);
  renderCatalog();
  assert.equal(document.project.presets.length, 1);
  assert.equal((await media.listMedia("target")).length, 0);
  assert.equal((await media.listAttachments("target", "copied")).length, 0);
} else if (scenario === "rollback") {
  const targetScope = { projectId: "target", presetId: "copied" };
  const undo = await copyPresetMedia({ projectId: "source", presetId: "copied" }, targetScope);
  const [created] = await media.listMedia("target");
  await media.attachMedia({ projectId: "target", presetId: "survivor", assetId: created.id });
  await undo();
  assert.equal((await media.listAttachments("target", "copied")).length, 0);
  assert.equal((await media.listAttachments("target", "survivor")).length, 1);
  assert.equal((await media.listMedia("target")).length, 1);
  const undoReuse = await copyPresetMedia({ projectId: "source", presetId: "copied" }, targetScope);
  await undoReuse();
  assert.equal((await media.listMedia("target")).length, 1);
  await media.attachMedia({ ...targetScope, assetId: created.id });
  await assert.rejects(copyPresetMedia({ projectId: "source", presetId: "copied" }, targetScope));
  assert.equal((await media.listAttachments("target", "copied"))[0].assetId, created.id);
} else if (scenario === "read-only") {
  let writable = false;
  let projectId = "source";
  const library = () =>
    render(() =>
      useMediaLibrary({
        projectId,
        presetId: "copied",
        writable,
        onError: (message) => errors.push(message),
      }),
    );
  let live = library();
  for (const action of [
    () => live.add(file, "audio"),
    () => live.rename(sourceAsset.id, "changed"),
    () => live.remove(sourceAsset.id),
    () => live.attach(sourceAsset.id),
    () => live.detach("audio"),
    () => live.updateTrim("audio", { startMs: 0, endMs: 1 }),
  ])
    assert.equal(await action(), null);
  writable = true;
  live = library();
  const staleRemove = live.remove;
  writable = false;
  library();
  assert.equal(await staleRemove(sourceAsset.id), null);
  writable = true;
  library();
  projectId = "other";
  library();
  assert.equal(await staleRemove(sourceAsset.id), null);
  assert.equal((await media.listMedia("source"))[0].name, "test.wav");
  assert.equal((await media.listAttachments("source", "copied")).length, 1);
  assert.equal(errors.length, 8);
} else if (scenario === "decode") {
  let writable = false;
  let decoded = 0;
  let finishDecode;
  const decoding = new Promise((resolve) => {
    finishDecode = resolve;
  });
  const tracks = () =>
    render(() =>
      useAttachedTracks({
        projectId: "target",
        presetId: "original",
        writable,
        onError: (message) => errors.push(message),
        audio: {
          loadFile: async () => {
            decoded++;
            return decoding;
          },
          clear: () => {},
          source: null,
          trim: { startMs: 0, endMs: 1 },
        },
        animation: { loadFile: async () => true, clear: () => {} },
        rive: { setRiv: () => {} },
      }),
    );
  assert.equal(await tracks().importFile(file, "audio"), false);
  assert.equal(decoded, 0);
  writable = true;
  const pending = tracks().importFile(file, "audio");
  assert.equal(decoded, 1);
  writable = false;
  tracks();
  finishDecode(true);
  assert.equal(await pending, false);
  assert.equal((await media.listMedia("target")).length, 0);
} else if (scenario === "locked-target" || scenario === "save-failure") {
  renderCatalog();
  if (scenario === "save-failure") {
    const store = localStorage.setItem;
    localStorage.setItem = (key, value) => {
      if (key === "buzzzz.project.target") throw new DOMException("Full", "QuotaExceededError");
      return store(key, value);
    };
  }
  assert.equal(await catalog.api.copyPattern("source", "copied", "target"), false);
  assert.equal(repository.readRecord("target").project.presets.length, 1);
  assert.equal((await media.listMedia("target")).length, 0);
  assert.equal((await media.listAttachments("target", "copied")).length, 0);
  assert.equal(reads, scenario === "locked-target" ? 0 : 1);
} else throw new Error(`Unknown scenario ${scenario}`);

if (parentPort) parentPort.postMessage(`PASS ${scenario}`);
else console.log(`PASS ${scenario}`);
