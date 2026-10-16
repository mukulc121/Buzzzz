import { useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import {
  emptyPattern,
  toDevice,
  type Pattern,
  type Project,
  type IPresetEditor,
} from "@buzzzz/core";
import * as history from "./history";
import { uid } from "./model";

const step = (state: history.IDocumentState, recipe: (project: Project) => Project) =>
  history.arm(history.edit(history.arm(state), history.PROJECT_SCOPE, recipe));

interface IProjectDocument {
  initial: Project;
  writable: boolean;
  onCommit: (project: Project) => void;
}

// The open project in memory, with per-pattern undo; every mutator is inert unless `writable`.
export function useProjectDocument(props: IProjectDocument) {
  const { initial, writable, onCommit } = props;
  const [state, setState] = useState(() => history.startDocument(initial));
  const latest = useRef(state);
  const [currentId, setCurrentId] = useState(() => initial.presets[0].id);
  const { project } = state;
  const preset = project.presets.find((item) => item.id === currentId) ?? project.presets[0];

  const mapped = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(project.map).flatMap(([trigger, id]) => {
          const target = project.presets.find((item) => item.id === id);
          return target ? [[trigger, toDevice(target.pattern)]] : [];
        }),
      ),
    [project],
  );

  // Reads the ref so several calls in one handler (begin, then setPattern) build on each other.
  const apply = (change: (current: history.IDocumentState) => history.IDocumentState) => {
    const current = latest.current;
    const next = writable ? change(current) : current;
    if (next === current) return false;
    latest.current = next;
    setState(next);
    if (next.project !== current.project) onCommit(next.project);
    return true;
  };

  const editPreset = (recipe: (item: typeof preset) => typeof preset, id = preset.id) =>
    apply((current) => {
      const item = current.project.presets.find((item) => item.id === id);
      if (!item) return current;
      const next = recipe(item);
      if (next === item) return current;
      return history.edit(current, id, (pr) => ({
        ...pr,
        presets: pr.presets.map((item) => (item.id === id ? next : item)),
      }));
    });

  const setProject: Dispatch<SetStateAction<Project>> = (action) =>
    apply((current) =>
      history.edit(current, history.PROJECT_SCOPE, (pr) =>
        typeof action === "function" ? action(pr) : action,
      ),
    );

  const reset = (next: Project) => {
    latest.current = history.startDocument(next);
    setState(latest.current);
    if (!next.presets.some((item) => item.id === currentId)) setCurrentId(next.presets[0].id);
  };

  return {
    project,
    getProject: () => latest.current.project,
    preset,
    pattern: preset.pattern,
    mapped,
    reset,
    begin: () => void apply(history.arm),
    undo: () => apply((current) => history.undo(current, preset.id)),
    redo: () => apply((current) => history.redo(current, preset.id)),
    canUndo: writable && history.canUndo(state.history, preset.id),
    canRedo: writable && history.canRedo(state.history, preset.id),
    setProject,
    setPattern: (pattern: Pattern) => editPreset((item) => ({ ...item, pattern })),
    setEditor: (editor: IPresetEditor) => editPreset((item) => ({ ...item, editor })),
    rename: (name: string) => editPreset((item) => ({ ...item, name })),
    renamePreset: (id: string, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return false;
      return editPreset((item) => (item.name === trimmed ? item : { ...item, name: trimmed }), id);
    },
    addPreset: (
      pattern: Pattern = emptyPattern(),
      name = "Untitled",
      options?: { select?: boolean },
    ) => {
      const id = uid();
      const added = apply((current) =>
        step(current, (pr) => ({ ...pr, presets: [...pr.presets, { id, name, pattern }] })),
      );
      if (added && options?.select !== false) setCurrentId(id);
    },
    removePreset: (id: string) => {
      if (project.presets.length === 1) return;
      const removed = apply((current) =>
        step(current, (pr) => ({
          ...pr,
          presets: pr.presets.filter((item) => item.id !== id),
          map: Object.fromEntries(Object.entries(pr.map).filter(([, target]) => target !== id)),
        })),
      );
      const next = project.presets.find((item) => item.id !== id);
      if (removed && id === preset.id && next) setCurrentId(next.id);
    },
    openProject: (next: Project) => {
      if (apply((current) => step(current, () => next))) setCurrentId(next.presets[0].id);
    },
    selectPreset: (id: string) => {
      setCurrentId(id);
      latest.current = history.arm(latest.current);
      setState(latest.current);
    },
  };
}
