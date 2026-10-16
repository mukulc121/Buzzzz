import { isProject, isRecord } from "@buzzzz/core";
import type { ISyncBase } from "./sync";

const KEY = "buzzzz.syncBases";

export function readSyncBases(): Map<string, ISyncBase> {
  const bases = new Map<string, ISyncBase>();
  try {
    const saved: unknown = JSON.parse(sessionStorage.getItem(KEY) ?? "[]");
    if (!Array.isArray(saved)) return bases;
    for (const entry of saved.slice(-32)) {
      if (!Array.isArray(entry) || entry.length !== 2) continue;
      const [id, base] = entry;
      if (
        typeof id !== "string" ||
        !/^[a-f0-9]{32}$/.test(id) ||
        !isRecord(base) ||
        typeof base.projectId !== "string" ||
        !/^[\w-]{1,64}$/.test(base.projectId) ||
        typeof base.revision !== "number" ||
        !Number.isSafeInteger(base.revision) ||
        base.revision < 0 ||
        typeof base.json !== "string" ||
        base.json.length > 1024 * 1024
      )
        continue;
      try {
        if (isProject(JSON.parse(base.json)))
          bases.set(id, { projectId: base.projectId, revision: base.revision, json: base.json });
      } catch {
        continue;
      }
    }
  } catch {
    return bases;
  }
  return bases;
}

export function storeSyncBase(roomId: string, base: ISyncBase) {
  try {
    const bases = readSyncBases();
    bases.delete(roomId);
    bases.set(roomId, base);
    sessionStorage.setItem(KEY, JSON.stringify([...bases].slice(-32)));
  } catch {
    // Sync remains conservative if this browser cannot remember its last shared revision.
  }
}
