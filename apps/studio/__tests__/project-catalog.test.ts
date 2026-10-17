import { beforeEach, expect, test } from "bun:test";
import {
  copyPatternInto,
  deriveProjectStatus,
  filterProjects,
  isProjectRecord,
  newRecord,
  projectName,
  starterProject,
  summarize,
} from "../src/features/project/model";
import * as repository from "../src/features/project/repository";

class MemoryStorage {
  data = new Map<string, string>();
  full = false;
  get length() {
    return this.data.size;
  }
  key(index: number) {
    return [...this.data.keys()][index] ?? null;
  }
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    if (this.full) throw new DOMException("full", "QuotaExceededError");
    this.data.set(key, value);
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
}
let storage: MemoryStorage;
beforeEach(() => {
  storage = new MemoryStorage();
  Object.assign(globalThis, { localStorage: storage });
});

test("records are validated", () => {
  const record = newRecord("  Demo ", starterProject());
  expect(record.name).toBe("Demo");
  expect(isProjectRecord(record)).toBe(true);
  expect(isProjectRecord({ ...record, revision: -1 })).toBe(false);
  expect(isProjectRecord({ ...record, name: "" })).toBe(false);
  expect(isProjectRecord({ ...record, id: "../x" })).toBe(false);
  expect(isProjectRecord({ ...record, project: { presets: [], map: {} } })).toBe(false);
  expect(projectName("   ")).toBe("Untitled project");
  expect(projectName("x".repeat(500))).toHaveLength(120);
});

test("search and sort", () => {
  const items = [
    { id: "1", name: "beta", createdAt: 3, updatedAt: 1, patterns: 1 },
    { id: "2", name: "Alpha", createdAt: 1, updatedAt: 3, patterns: 2 },
    { id: "3", name: "gamma beta", createdAt: 2, updatedAt: 2, patterns: 3 },
  ];
  expect(filterProjects(items, "", "updated").map((i) => i.id)).toEqual(["2", "3", "1"]);
  expect(filterProjects(items, "", "name").map((i) => i.id)).toEqual(["2", "1", "3"]);
  expect(filterProjects(items, "", "created").map((i) => i.id)).toEqual(["1", "3", "2"]);
  expect(filterProjects(items, " BETA", "name").map((i) => i.id)).toEqual(["1", "3"]);
});

test("copying a pattern never reuses an id in the target", () => {
  const target = starterProject();
  const copied = copyPatternInto(target, target.presets[0]);
  expect(copied.presets).toHaveLength(2);
  expect(new Set(copied.presets.map((p) => p.id)).size).toBe(2);
  expect(target.presets).toHaveLength(1);
});

test("status derivation", () => {
  const base = { hasConflict: false, storageError: null };
  expect(deriveProjectStatus({ ...base, lock: "held" })).toBe("editing");
  expect(deriveProjectStatus({ ...base, lock: "busy" })).toBe("read-only");
  expect(deriveProjectStatus({ ...base, lock: "stolen" })).toBe("taken-over");
  expect(deriveProjectStatus({ ...base, lock: "held", storageError: "full" })).toBe(
    "storage-error",
  );
  expect(deriveProjectStatus({ lock: "held", hasConflict: true, storageError: "full" })).toBe(
    "conflict",
  );
});

test("the old single document is copied once and left in place", () => {
  const legacy = starterProject();
  legacy.presets[0].name = "Mine";
  storage.setItem("rive-haptics-project", JSON.stringify(legacy));
  const first = repository.initialRecord({ createStarter: false }).record;
  if (!first) throw new Error("The legacy project was not migrated");
  expect(first.project.presets[0].name).toBe("Mine");
  expect(storage.getItem("rive-haptics-project")).not.toBeNull();
  expect(repository.initialRecord().record?.id).toBe(first.id);
  expect(repository.listProjects()).toHaveLength(1);
});

test("saves refuse to overwrite a newer revision", () => {
  const record = newRecord("Demo", starterProject());
  repository.writeRecord(record);
  const mine = repository.saveRecord(record, { name: "Demo", project: starterProject() });
  expect(mine.kind).toBe("saved");
  const stale = repository.saveRecord(record, { name: "Demo", project: starterProject() });
  expect(stale.kind).toBe("conflict");
  expect(stale.kind === "conflict" && stale.theirs?.revision).toBe(1);
  expect(repository.saveRecord(record, record, true).kind).toBe("saved");
  expect(repository.readRecord(record.id)?.revision).toBe(2);
});

test("a deleted project surfaces as a conflict instead of being recreated", () => {
  const record = newRecord("Demo", starterProject());
  repository.writeRecord(record);
  const saved = repository.saveRecord(record, record);
  repository.removeRecord(record.id);
  if (saved.kind !== "saved") throw new Error("not saved");
  expect(repository.saveRecord(saved.record, saved.record)).toEqual({
    kind: "conflict",
    theirs: null,
  });
});

test("deleting an unsaved revision-zero project cannot be undone by a stale writer", () => {
  const record = newRecord("Demo", starterProject());
  repository.writeRecord(record);
  repository.removeRecord(record.id);
  expect(repository.saveRecord(record, record)).toEqual({ kind: "conflict", theirs: null });
  expect(repository.listProjects()).toEqual([]);
});

test("an emptied catalog stays empty instead of reseeding or remigrating the legacy document", () => {
  storage.setItem("rive-haptics-project", JSON.stringify(starterProject()));
  const initial = repository.initialRecord().record;
  if (!initial) throw new Error("The legacy project was not migrated");
  repository.removeRecord(initial.id);
  expect(repository.initialRecord()).toEqual({ record: null, error: null });
  expect(repository.listProjects()).toEqual([]);
});

test("deleting a record without a remembered project still preserves the empty catalog", () => {
  const record = newRecord("Demo", starterProject());
  repository.writeRecord(record);
  repository.removeRecord(record.id);
  expect(repository.initialRecord()).toEqual({ record: null, error: null });
  expect(repository.listProjects()).toEqual([]);
});

test("explicit dashboard initialization is empty while a first legacy entry keeps its starter", () => {
  expect(repository.initialRecord({ createStarter: false })).toEqual({ record: null, error: null });
  expect(repository.listProjects()).toEqual([]);
  const initial = repository.initialRecord().record;
  expect(initial?.project.presets[0].name).toBe("Thud");
  expect(repository.listProjects()).toHaveLength(1);
});

test("storage failures are reported and leave the stored copy alone", () => {
  const record = newRecord("Demo", starterProject());
  repository.writeRecord(record);
  storage.full = true;
  const result = repository.saveRecord(record, { name: "Changed", project: record.project });
  expect(result.kind).toBe("error");
  expect(repository.readRecord(record.id)?.name).toBe("Demo");
});

test("shared links get their own key and never touch private projects", () => {
  const own = newRecord("Private", starterProject());
  repository.writeRecord(own);
  const id = repository.sharedLink(
    `?shareRoom=${"r".repeat(32)}&shareId=${"s".repeat(32)}&shareToken=t`,
  );
  expect(id).toBe(`shared-${"s".repeat(32)}`);
  expect(repository.sharedLink("?other=1")).toBeNull();
  const shared = repository.sharedRecord(id ?? "");
  repository.saveRecord(shared, { name: shared.name, project: starterProject() });
  expect(repository.listProjects().map((item) => item.id)).toEqual([own.id]);
  expect(storage.getItem(`buzzzz.shared.${"s".repeat(32)}`)).not.toBeNull();
  expect(repository.readRecord(own.id)).toEqual(own);
});

test("invalid stored records are skipped", () => {
  storage.setItem("buzzzz.project.bad", "{");
  storage.setItem("buzzzz.project.worse", JSON.stringify({ id: "worse" }));
  const record = newRecord("Good", starterProject());
  repository.writeRecord(record);
  expect(repository.listProjects()).toEqual([summarize(record)]);
});
