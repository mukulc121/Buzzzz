import { randomUUID } from "../../crypto";
import { emptyPattern, isProject, isRecord, type Preset, type Project } from "@buzzzz/core";

export interface IProjectRecord {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  revision: number;
  project: Project;
}

export interface IProjectSummary {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  patterns: number;
  previews: Preset[];
}

export type TProjectSort = "updated" | "name" | "created";
export type TLockState = "pending" | "held" | "busy" | "stolen" | "unsupported";
export type TConflictChoice = "keep-mine" | "use-theirs" | "save-copy";
export type TProjectStatus =
  | "opening"
  | "editing"
  | "read-only"
  | "taken-over"
  | "conflict"
  | "storage-error"
  | "unlocked";

const MAX_NAME = 120;
export const PREVIEWS = 5;

export const uid = () => Math.random().toString(36).slice(2, 9);
const projectId = () => randomUUID();

export const projectName = (name: string) => name.trim().slice(0, MAX_NAME) || "Untitled project";

export const starterProject = (): Project => ({
  presets: [
    {
      id: uid(),
      name: "Thud",
      pattern: {
        discretePattern: [{ time: 0, amplitude: 1, frequency: 0.6 }],
        continuousPattern: {
          amplitude: [
            { time: 0, value: 0.8 },
            { time: 120, value: 0.3 },
            { time: 300, value: 0 },
          ],
          frequency: [
            { time: 0, value: 0.4 },
            { time: 300, value: 0.1 },
          ],
        },
      },
    },
  ],
  map: {},
});

export const emptyProject = (): Project => ({
  presets: [{ id: uid(), name: "Untitled pattern", pattern: emptyPattern() }],
  map: {},
});

export function newRecord(name: string, project: Project, now = Date.now()): IProjectRecord {
  return {
    id: projectId(),
    name: projectName(name),
    createdAt: now,
    updatedAt: now,
    revision: 0,
    project,
  };
}

const isTime = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;

export function isProjectRecord(value: unknown): value is IProjectRecord {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    /^[\w-]{1,64}$/.test(value.id) &&
    typeof value.name === "string" &&
    value.name.length > 0 &&
    value.name.length <= MAX_NAME &&
    isTime(value.createdAt) &&
    isTime(value.updatedAt) &&
    Number.isInteger(value.revision) &&
    isTime(value.revision) &&
    isProject(value.project)
  );
}

export const summarize = (record: IProjectRecord): IProjectSummary => ({
  id: record.id,
  name: record.name,
  createdAt: record.createdAt,
  updatedAt: record.updatedAt,
  patterns: record.project.presets.length,
  previews: record.project.presets.slice(0, PREVIEWS),
});

type TSortable = Pick<IProjectSummary, "name" | "createdAt" | "updatedAt">;

export function filterProjects<T extends TSortable>(items: T[], query: string, sort: TProjectSort) {
  const needle = query.trim().toLowerCase();
  const found = needle ? items.filter((item) => item.name.toLowerCase().includes(needle)) : items;
  return found.toSorted((a, b) => {
    if (sort === "name") return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    if (sort === "created") return b.createdAt - a.createdAt;
    return b.updatedAt - a.updatedAt;
  });
}

export function copyPatternInto(
  target: Project,
  source: Preset,
  id = freePresetId(target, source.id),
): Project {
  return { ...target, presets: [...target.presets, { ...structuredClone(source), id }] };
}

export function freePresetId(target: Project, preferred: string) {
  const ids = new Set(target.presets.map((preset) => preset.id));
  let id = preferred;
  while (ids.has(id)) id = uid();
  return id;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function editedAgo(time: number, now = Date.now()) {
  const elapsed = now - time;
  if (elapsed < MINUTE) return "just now";
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)} min ago`;
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)} hr ago`;
  if (elapsed < 2 * DAY) return "yesterday";
  if (elapsed < 7 * DAY) return `${Math.floor(elapsed / DAY)} days ago`;
  return new Date(time).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export const patternCount = (count: number) =>
  count === 0 ? "No patterns" : `${count} ${count === 1 ? "pattern" : "patterns"}`;

export function deriveProjectStatus(state: {
  lock: TLockState;
  hasConflict: boolean;
  storageError: string | null;
}): TProjectStatus {
  if (state.hasConflict) return "conflict";
  if (state.storageError) return "storage-error";
  switch (state.lock) {
    case "pending":
      return "opening";
    case "held":
      return "editing";
    case "busy":
      return "read-only";
    case "stolen":
      return "taken-over";
    case "unsupported":
      return "unlocked";
  }
}

export const canWrite = (lock: TLockState) => lock === "held" || lock === "unsupported";
