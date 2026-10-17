import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { Project } from "@buzzzz/core";
import {
  canWrite,
  deriveProjectStatus,
  emptyProject,
  newRecord,
  summarize,
  type IProjectRecord,
  type TConflictChoice,
  type TLockState,
} from "./model";
import * as repository from "./repository";
import { useProjectCatalog } from "./useProjectCatalog";
import { useProjectDocument } from "./useProjectDocument";
import { claimWriter, lockName, type IWriterLock } from "./writerLock";
import { parseProjectRoute, patternRouteId, selectedProjectPattern } from "./projectRouting";
import { readSelectedPattern, rememberSelectedPattern } from "./projectSelection";
import { useProjectRoute } from "./useProjectRoute";

function recordSelection(record: IProjectRecord, requested?: string | null) {
  const route = parseProjectRoute(location);
  const matches =
    (route.kind === "project" || route.kind === "shared") && route.projectId === record.id;
  return selectedProjectPattern(
    record.project,
    requested === undefined
      ? matches || route.kind === "legacy"
        ? patternRouteId(location)
        : null
      : requested,
    readSelectedPattern(record.id),
  );
}

function initialState() {
  const shared = repository.sharedLink(location.search);
  if (shared) return { record: repository.sharedRecord(shared), error: null, selected: true };
  const route = parseProjectRoute(location);
  if (route.kind === "project") {
    const record = repository.readRecord(route.projectId);
    if (record) {
      repository.rememberLast(record.id);
      return { record, error: null, selected: true };
    }
  }
  const initial = repository.initialRecord({ createStarter: route.kind === "legacy" });
  return {
    record: initial.record ?? newRecord("Untitled project", emptyProject()),
    error: initial.error,
    selected: initial.record !== null,
  };
}

export function useProject() {
  const [start] = useState(initialState);
  const [active, setActive] = useState<IProjectRecord>(start.record);
  const [selected, setSelected] = useState(start.selected);
  const selectedRef = useRef(start.selected);
  const base = useRef(start.record);
  const [storageError, setStorageError] = useState<string | null>(start.error);
  const [conflict, setConflict] = useState<{ theirs: IProjectRecord | null } | null>(null);
  const [lock, setLock] = useState<TLockState>("pending");
  const writer = useRef<IWriterLock | null>(null);
  const isWriter = selected && canWrite(lock) && !conflict;
  const isShared = active.id.startsWith("shared-");

  const adopt = (record: IProjectRecord) => {
    base.current = record;
    setActive(record);
  };

  // Only writes when nobody else saved since our last revision.
  const persist = (project: Project, name = base.current.name) => {
    if (!selectedRef.current) return false;
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
    initialPresetId: recordSelection(start.record),
    writable: isWriter,
    onCommit: (project) => persist(project),
  });

  const load = (record: IProjectRecord, patternId = recordSelection(record)) => {
    selectedRef.current = true;
    setSelected(true);
    adopt(record);
    setConflict(null);
    document.reset(record.project, patternId);
  };

  const switchTo = (record: IProjectRecord) => {
    const removed = selectedRef.current && !isShared && !repository.readRecord(base.current.id);
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
    onEmpty: () => {
      selectedRef.current = false;
      setSelected(false);
      writer.current?.release();
      writer.current = null;
      const placeholder = newRecord("Untitled project", emptyProject());
      adopt(placeholder);
      document.reset(placeholder.project);
      setConflict(null);
      setStorageError(null);
      route.showDashboard(true);
    },
  });
  const { refresh } = catalog;
  const route = useProjectRoute({
    projectId: active.id,
    projectAvailable: selected,
    patternId: document.preset.id,
    onOpen: (id, requested) => {
      const record = id.startsWith("shared-")
        ? repository.sharedRecord(id)
        : repository.readRecord(id);
      if (!record) return null;
      const patternId = recordSelection(record, requested);
      if (id !== active.id) {
        load(record, patternId);
        setStorageError(null);
        if (!id.startsWith("shared-")) repository.rememberLast(id);
        refresh();
      } else if (document.preset.id !== patternId) document.selectPreset(patternId);
      return patternId;
    },
  });

  // Writers only see a newer revision when someone saved without the lock; followers reload.
  const followStorage = useEffectEvent((acquired: boolean) => {
    if (!selectedRef.current) return;
    const theirs = repository.readRecord(base.current.id);
    if (theirs?.revision === base.current.revision) return;
    if (isWriter && !acquired) setConflict({ theirs });
    else if (theirs) load(theirs);
  });

  useEffect(() => {
    if (!selected) return;
    const claim = claimWriter(lockName(active.id), (state) => {
      setLock(state);
      if (state === "held") followStorage(true);
    });
    writer.current = claim;
    return () => claim.release();
  }, [active.id, selected]);

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
    selectPreset: (id: string) => {
      if (!document.getProject().presets.some((preset) => preset.id === id)) return;
      document.selectPreset(id);
      rememberSelectedPattern(active.id, id);
      route.selectPattern(id);
    },
    openProject: (project: Project) => {
      document.openProject(project);
      document.selectPreset(
        selectedProjectPattern(project, patternRouteId(location), readSelectedPattern(active.id)),
      );
    },
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
