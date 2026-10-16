import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { Project } from "@buzzzz/core";
import {
  copyPatternInto,
  freePresetId,
  newRecord,
  projectName,
  emptyProject,
  type IProjectRecord,
  type IProjectSummary,
} from "./model";
import * as repository from "./repository";
import type { useProjectDocument } from "./useProjectDocument";
import { lockName, whenFree } from "./writerLock";
import { cloneProjectMedia } from "../media/clone";
import { copyPresetMedia } from "./mediaTransfer";
import { serializeProjectCopy } from "./copyLock";
import { duplicatePreset } from "./duplicatePreset";

interface IProjectCatalog {
  activeId: string;
  document: ReturnType<typeof useProjectDocument>;
  ownsActive: boolean;
  switchTo: (record: IProjectRecord) => void;
  persist: (project: Project, name?: string) => boolean;
  setStorageError: (message: string | null) => void;
}

export function useProjectCatalog(props: IProjectCatalog) {
  const { activeId, document, ownsActive, switchTo, persist, setStorageError } = props;
  const latest = useRef({ activeId, ownsActive, document, generation: 0 });
  useLayoutEffect(() => {
    const before = latest.current;
    latest.current = {
      activeId,
      ownsActive,
      document,
      generation:
        before.generation +
        Number(before.activeId !== activeId || before.ownsActive !== ownsActive),
    };
  });
  const [items, setItems] = useState(repository.listProjects);
  const refresh = useCallback(() => setItems(repository.listProjects()), []);
  const touch = useCallback(
    (summary: IProjectSummary) =>
      setItems((list) => list.map((item) => (item.id === summary.id ? summary : item))),
    [],
  );

  const store = (record: IProjectRecord) => {
    const error = repository.writeRecord(record);
    setStorageError(error);
    refresh();
    return error ? null : record.id;
  };

  // Changes to a project this window has not opened, only while no other window holds it.
  const patch = async (id: string, recipe: (record: IProjectRecord) => IProjectRecord) => {
    const result = await whenFree(lockName(id), () => ({
      error: repository.patchRecord(id, recipe),
    }));
    if (result?.error) setStorageError(result.error);
    refresh();
    return result !== null && !result.error;
  };

  const create = (name = "Untitled project") => {
    const record = newRecord(name, emptyProject());
    if (!store(record)) return null;
    switchTo(record);
    return record.id;
  };

  const openFallback = () => {
    const recent = repository
      .listProjects()
      .filter((item) => item.id !== activeId)
      .toSorted((a, b) => b.updatedAt - a.updatedAt)[0];
    const record = recent && repository.readRecord(recent.id);
    if (record) switchTo(record);
    else create();
  };

  const saveCopy = async (
    name: string,
    project: Project,
    sourceId = activeId,
  ): Promise<string | null> => {
    const record = newRecord(`${name} copy`, structuredClone(project));
    let rollback: (() => Promise<void>) | undefined;
    try {
      rollback = await cloneProjectMedia(sourceId, record.id);
      const error = repository.writeRecord(record);
      if (error) throw new Error(error);
      refresh();
      setStorageError(null);
      return record.id;
    } catch (error) {
      repository.removeRecord(record.id);
      try {
        await rollback?.();
      } catch {
        setStorageError("The project copy failed and its temporary media could not be removed.");
        return null;
      }
      setStorageError(error instanceof Error ? error.message : "Could not copy this project.");
      return null;
    }
  };

  const copyPattern = async (
    sourceId: string,
    presetId: string,
    targetId: string,
    duplicate = false,
  ) => {
    if (sourceId === targetId && !duplicate) return null;
    const generation = latest.current.generation;
    const current = () => latest.current.generation === generation;
    try {
      return await serializeProjectCopy(targetId, async () => {
        if (!current()) return null;
        const copy = async () => {
          const live = latest.current;
          const from =
            sourceId === live.activeId
              ? live.document.getProject()
              : repository.readRecord(sourceId)?.project;
          const source = from?.presets.find((item) => item.id === presetId);
          const active = targetId === live.activeId;
          const target = active
            ? live.document.getProject()
            : repository.readRecord(targetId)?.project;
          if (!current() || !source || !target || (active && !live.ownsActive)) return null;
          const preset = duplicate ? duplicatePreset(target, source.id) : source;
          if (!preset) return null;
          const id = duplicate ? preset.id : freePresetId(target, source.id);
          const undo = await copyPresetMedia(
            { projectId: sourceId, presetId },
            { projectId: targetId, presetId: id },
          );
          let copied = false;
          try {
            if (!current() || (active && !latest.current.ownsActive)) return null;
            if (active) {
              const doc = latest.current.document;
              doc.begin();
              doc.setProject((project) => {
                if (project.presets.some((item) => item.id === id)) return project;
                copied = true;
                return copyPatternInto(project, preset, id);
              });
            } else {
              const error = repository.patchRecord(targetId, (record) => ({
                ...record,
                project: copyPatternInto(record.project, preset, id),
              }));
              if (error) setStorageError(error);
              copied = !error;
            }
            refresh();
            return copied ? id : null;
          } finally {
            if (!copied) await undo();
          }
        };
        if (targetId === latest.current.activeId) return copy();
        const result = await whenFree(lockName(targetId), async () => ({
          copied: await copy(),
        }));
        return result?.copied ?? null;
      });
    } catch (error) {
      setStorageError(
        error instanceof Error ? error.message : "Could not copy this pattern's media.",
      );
      return null;
    }
  };

  return {
    refresh,
    touch,
    saveCopy,
    openFallback,
    api: {
      items,
      refresh,
      create,
      open: (id: string) => {
        const record = id !== activeId && repository.readRecord(id);
        if (record) {
          switchTo(record);
          refresh();
        }
        return Boolean(record);
      },
      rename: async (id: string, name: string) => {
        if (id !== activeId) return patch(id, (record) => ({ ...record, name: projectName(name) }));
        return ownsActive && persist(document.project, projectName(name));
      },
      duplicate: async (id: string): Promise<string | null> => {
        const record = repository.readRecord(id);
        if (id === activeId && record) return saveCopy(record.name, document.project);
        return record ? saveCopy(record.name, record.project, id) : null;
      },
      remove: async (id: string) => {
        if (id !== activeId) {
          const removed = await whenFree(lockName(id), () => ({ id: repository.removeRecord(id) }));
          refresh();
          return removed !== null;
        }
        if (!ownsActive) return false;
        repository.removeRecord(id);
        openFallback();
        refresh();
        return true;
      },
      copyPattern: async (sourceId: string, presetId: string, targetId: string) =>
        Boolean(await copyPattern(sourceId, presetId, targetId)),
      duplicatePreset: async (presetId: string) => {
        if (activeId !== latest.current.activeId || !latest.current.ownsActive) return null;
        return copyPattern(activeId, presetId, activeId, true);
      },
    },
  };
}
