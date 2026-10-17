import { useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import {
  emptyPattern,
  resolveRivePresetId,
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
  onCommit: (project: Project) => boolean | void;
}

// The open project in memory, with per-pattern undo; every mutator is inert unless `writable`.
export function useProjectDocument(props: IProjectDocument) {
  const { initial, writable, onCommit } = props;
  const [state, setState] = useState(() => history.startDocument(initial));
  const latest = useRef(state);
  const [currentId, setCurrentId] = useState(() => initial.presets[0].id);
  const [renamingId, setRenamingId] = useState<string | null>(null);
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
    setRenamingId(null);
    latest.current = history.startDocument(next);
    setState(latest.current);
    if (!next.presets.some((item) => item.id === currentId)) setCurrentId(next.presets[0].id);
  };

  return {
    project,
    getProject: () => latest.current.project,
    preset,
    renamingId,
    pattern: preset.pattern,
    mapped,
    reset,
    begin: () => void apply(history.arm),
    undo: () => apply((current) => history.undo(current, preset.id)),
    redo: () => apply((current) => history.redo(current, preset.id)),
    canUndo: writable && history.canUndo(state.history, preset.id),
    canRedo: writable && history.canRedo(state.history, preset.id),
    setProject,
    commitProject: (recipe: (project: Project) => Project) => {
      if (!writable) return false;
      const current = latest.current;
      const next = history.edit(current, history.PROJECT_SCOPE, recipe);
      if (next === current) return true;
      if (onCommit(next.project) === false) return false;
      latest.current = next;
      setState(next);
      return true;
    },
    setPattern: (pattern: Pattern) => editPreset((item) => ({ ...item, pattern })),
    setEditor: (editor: IPresetEditor) => editPreset((item) => ({ ...item, editor })),
    renamePreset: (id: string, name: string) => {
      const trimmed = name.trim();
      setRenamingId((current) => (current === id ? null : current));
      if (!trimmed) return false;
      return editPreset((item) => (item.name === trimmed ? item : { ...item, name: trimmed }), id);
    },
    startRenaming: (id: string) => {
      if (writable && latest.current.project.presets.some((item) => item.id === id))
        setRenamingId(id);
    },
    cancelRenaming: () => setRenamingId(null),
    addPreset: (
      pattern: Pattern = emptyPattern(),
      name = "Untitled pattern",
      options?: { select?: boolean; rename?: boolean; durationMs?: number },
    ) => {
      const id = uid();
      const editor =
        options?.durationMs === undefined
          ? undefined
          : { markers: [], range: null, durationMs: options.durationMs };
      const added = apply((current) =>
        step(current, (pr) => ({
          ...pr,
          presets: [...pr.presets, { id, name, pattern, ...(editor ? { editor } : {}) }],
        })),
      );
      if (added && options?.select !== false) {
        setCurrentId(id);
        setRenamingId(options?.rename ? id : null);
      }
      return added ? id : null;
    },
    removePreset: (id: string) => {
      if (project.presets.length === 1) return;
      const removed = apply((current) =>
        step(current, (pr) => ({
          ...pr,
          presets: pr.presets.filter((item) => item.id !== id),
          map:
            resolveRivePresetId(pr) === id
              ? {}
              : Object.fromEntries(Object.entries(pr.map).filter(([, target]) => target !== id)),
          ...(resolveRivePresetId(pr) === id
            ? { rivePresetId: null, riveConfig: undefined, riveStateMachine: undefined }
            : {}),
        })),
      );
      const next = project.presets.find((item) => item.id !== id);
      if (removed) setRenamingId((current) => (current === id ? null : current));
      if (removed && id === preset.id && next) setCurrentId(next.id);
    },
    openProject: (next: Project) => {
      if (apply((current) => step(current, () => next))) setCurrentId(next.presets[0].id);
    },
    selectPreset: (id: string) => {
      setRenamingId(null);
      setCurrentId(id);
      latest.current = history.arm(latest.current);
      setState(latest.current);
    },
  };
}
