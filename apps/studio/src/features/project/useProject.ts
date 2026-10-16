import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { Project } from "@buzzzz/core";
import {
  canWrite,
  deriveProjectStatus,
  summarize,
  type IProjectRecord,
  type TConflictChoice,
  type TLockState,
} from "./model";
import * as repository from "./repository";
import { useProjectCatalog } from "./useProjectCatalog";
import { useProjectDocument } from "./useProjectDocument";
import { claimWriter, lockName, type IWriterLock } from "./writerLock";
import { parseProjectRoute } from "./projectRouting";
import { useProjectRoute } from "./useProjectRoute";

function initialState() {
  const shared = repository.sharedLink(location.search);
  if (shared) return { record: repository.sharedRecord(shared), error: null };
  const route = parseProjectRoute(location);
  if (route.kind === "project") {
    const record = repository.readRecord(route.projectId);
    if (record) {
      repository.rememberLast(record.id);
      return { record, error: null };
    }
  }
  return repository.initialRecord();
}

export function useProject() {
  const [start] = useState(initialState);
  const [active, setActive] = useState<IProjectRecord>(start.record);
  const base = useRef(start.record);
  const [storageError, setStorageError] = useState<string | null>(start.error);
  const [conflict, setConflict] = useState<{ theirs: IProjectRecord | null } | null>(null);
  const [lock, setLock] = useState<TLockState>("pending");
  const writer = useRef<IWriterLock | null>(null);
  const isWriter = canWrite(lock) && !conflict;
  const isShared = active.id.startsWith("shared-");

  const adopt = (record: IProjectRecord) => {
    base.current = record;
    setActive(record);
  };

  // Only writes when nobody else saved since our last revision.
  const persist = (project: Project, name = base.current.name) => {
    const result = repository.saveRecord(base.current, { name, project });
    if (result.kind === "conflict") setConflict({ theirs: result.theirs });
    if (result.kind === "error") setStorageError(result.message);
    if (result.kind !== "saved") return false;
    adopt(result.record);
    setStorageError(null);
    if (!isShared) catalog.touch(summarize(result.record));
    return true;
  };

  const document = useProjectDocument({
    initial: start.record.project,
    writable: isWriter,
    onCommit: (project) => void persist(project),
  });

  const load = (record: IProjectRecord) => {
    adopt(record);
    setConflict(null);
    document.reset(record.project);
  };

  const switchTo = (record: IProjectRecord) => {
    const removed = !isShared && !repository.readRecord(base.current.id);
    load(record);
    setStorageError(null);
    if (!record.id.startsWith("shared-")) repository.rememberLast(record.id);
    if (removed) route.showDashboard(true);
    else route.openProject(record.id);
  };

  const catalog = useProjectCatalog({
    activeId: active.id,
    document,
    ownsActive: isWriter,
    switchTo,
    persist,
    setStorageError,
  });
  const { refresh } = catalog;
  const route = useProjectRoute({
    projectId: active.id,
    onOpen: (id) => {
      const record = id.startsWith("shared-")
        ? repository.sharedRecord(id)
        : repository.readRecord(id);
      if (!record) return false;
      if (id !== active.id) {
        load(record);
        setStorageError(null);
        if (!id.startsWith("shared-")) repository.rememberLast(id);
        refresh();
      }
      return true;
    },
  });

  // Writers only see a newer revision when someone saved without the lock; followers reload.
  const followStorage = useEffectEvent((acquired: boolean) => {
    const theirs = repository.readRecord(base.current.id);
    if (theirs?.revision === base.current.revision) return;
    if (isWriter && !acquired) setConflict({ theirs });
    else if (theirs) load(theirs);
  });

  useEffect(() => {
    const claim = claimWriter(lockName(active.id), (state) => {
      setLock(state);
      if (state === "held") followStorage(true);
    });
    writer.current = claim;
    return () => claim.release();
  }, [active.id]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (!repository.isRecordKey(event.key)) return;
      refresh();
      followStorage(false);
    };
    addEventListener("storage", onStorage);
    return () => removeEventListener("storage", onStorage);
  }, [refresh]);

  const resolveConflict = async (choice: TConflictChoice) => {
    if (choice === "keep-mine") {
      if (!canWrite(lock)) return;
      const next = { name: base.current.name, project: document.project };
      const result = repository.saveRecord(base.current, next, true);
      if (result.kind === "error") return setStorageError(result.message);
      if (result.kind !== "saved") return;
      adopt(result.record);
      setConflict(null);
      return refresh();
    }
    if (choice === "save-copy") {
      const source = base.current;
      const id = await catalog.saveCopy(base.current.name, document.project);
      if (base.current !== source) return;
      const copy = id && repository.readRecord(id);
      if (copy) switchTo(copy);
      return;
    }
    if (conflict?.theirs) load(conflict.theirs);
    else catalog.openFallback();
  };

  return {
    ...document,
    duplicatePreset: catalog.api.duplicatePreset,
    route,
    projectId: active.id,
    projectName: active.name,
    isShared,
    isWriter,
    status: deriveProjectStatus({ lock, hasConflict: conflict !== null, storageError }),
    storageError,
    conflict: conflict?.theirs ?? null,
    hasConflict: conflict !== null,
    takeOver: async () => writer.current?.takeOver(),
    resolveConflict,
    catalog: catalog.api,
  };
}
