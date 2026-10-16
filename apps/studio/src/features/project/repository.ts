import { isProject, type Project } from "@buzzzz/core";
import {
  isProjectRecord,
  newRecord,
  starterProject,
  summarize,
  type IProjectRecord,
  type IProjectSummary,
} from "./model";

const PREFIX = "buzzzz.project.";
const SHARED_PREFIX = "buzzzz.shared.";
const LAST = "buzzzz.lastProject";
const LEGACY = "rive-haptics-project";

export type TSaveResult =
  | { kind: "saved"; record: IProjectRecord }
  | { kind: "conflict"; theirs: IProjectRecord | null }
  | { kind: "error"; message: string };

const recordKey = (id: string) =>
  id.startsWith("shared-") ? SHARED_PREFIX + id.slice(7) : PREFIX + id;
export const isRecordKey = (key: string | null) =>
  key === null || key.startsWith(PREFIX) || key.startsWith(SHARED_PREFIX);

function storageMessage(error: unknown) {
  return error instanceof DOMException && error.name === "QuotaExceededError"
    ? "Browser storage is full. Edits stay in this tab until you free space."
    : "Browser storage is unavailable. Edits stay in this tab only.";
}

export function readRecord(id: string): IProjectRecord | null {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(recordKey(id)) ?? "null");
    return isProjectRecord(value) && value.id === id ? value : null;
  } catch {
    return null;
  }
}

export function writeRecord(record: IProjectRecord): string | null {
  try {
    localStorage.setItem(recordKey(record.id), JSON.stringify(record));
    return null;
  } catch (error) {
    return storageMessage(error);
  }
}

// Writes only when nobody else saved since `base`; otherwise hands their copy back.
export function saveRecord(
  base: IProjectRecord,
  next: { name: string; project: Project },
  force = false,
): TSaveResult {
  const stored = readRecord(base.id);
  if (!force && (stored?.revision ?? 0) !== base.revision)
    return { kind: "conflict", theirs: stored };
  const record: IProjectRecord = {
    ...base,
    ...next,
    revision: Math.max(base.revision, stored?.revision ?? 0) + 1,
    updatedAt: Date.now(),
  };
  const message = writeRecord(record);
  return message ? { kind: "error", message } : { kind: "saved", record };
}

export function removeRecord(id: string) {
  try {
    localStorage.removeItem(recordKey(id));
  } catch {
    /* nothing stored */
  }
  return id;
}

export function storageReadable() {
  try {
    return typeof localStorage.length === "number";
  } catch {
    return false;
  }
}

export function listProjects(): IProjectSummary[] {
  const items: IProjectSummary[] = [];
  try {
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);
      if (!key?.startsWith(PREFIX)) continue;
      const record = readRecord(key.slice(PREFIX.length));
      if (record) items.push(summarize(record));
    }
  } catch {
    /* storage blocked */
  }
  return items;
}

export function rememberLast(id: string) {
  try {
    localStorage.setItem(LAST, id);
  } catch {
    /* storage blocked */
  }
}

function legacyProject(): Project | null {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(LEGACY) ?? "null");
    return isProject(value) ? value : null;
  } catch {
    return null;
  }
}

// Last opened, else the old single document (copied, never deleted), else a starter.
export function initialRecord(): { record: IProjectRecord; error: string | null } {
  let last: string | null = null;
  try {
    last = localStorage.getItem(LAST);
  } catch {
    /* storage blocked */
  }
  const existing = (last && readRecord(last)) || pickRecent();
  if (existing) return { record: existing, error: null };
  const legacy = legacyProject();
  const record = newRecord(legacy ? "My project" : "Untitled project", legacy ?? starterProject());
  const error = writeRecord(record);
  if (!error) rememberLast(record.id);
  return { record, error };
}

function pickRecent() {
  const recent = listProjects().toSorted((a, b) => b.updatedAt - a.updatedAt)[0];
  return recent ? readRecord(recent.id) : null;
}

export function sharedLink(search: string) {
  const params = new URLSearchParams(search);
  if (!params.has("shareRoom") && !params.has("shareId") && !params.has("shareToken")) return null;
  return `shared-${(params.get("shareId") ?? "").replace(/\W/g, "").slice(0, 32) || "link"}`;
}

export function sharedRecord(id: string): IProjectRecord {
  const now = Date.now();
  return (
    readRecord(id) ?? {
      id,
      name: "Shared project",
      createdAt: now,
      updatedAt: now,
      revision: 0,
      project: starterProject(),
    }
  );
}

// Read-modify-write for a project this window does not have open.
export function patchRecord(id: string, recipe: (record: IProjectRecord) => IProjectRecord) {
  const record = readRecord(id);
  if (!record) return "This project no longer exists.";
  return writeRecord({ ...recipe(record), revision: record.revision + 1, updatedAt: Date.now() });
}
