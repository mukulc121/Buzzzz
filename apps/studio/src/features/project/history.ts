import type { Project } from "@buzzzz/core";

type Preset = Project["presets"][number];

export const PROJECT_SCOPE = Symbol("project");
type TScope = string | typeof PROJECT_SCOPE;
const LIMIT = 100;

type TEntry =
  | { seq: number; kind: "pattern"; preset: Preset }
  | { seq: number; kind: "project"; project: Project; touched: string[] };

type TStacks = Partial<Record<TScope, TEntry[]>>;

export interface IHistory {
  past: TStacks;
  future: TStacks;
  open: TScope | null;
  seq: number;
}

export interface IDocumentState {
  project: Project;
  history: IHistory;
}

const emptyHistory = (): IHistory => ({ past: {}, future: {}, open: null, seq: 0 });

export const startDocument = (project: Project): IDocumentState => ({
  project,
  history: emptyHistory(),
});

const entries = (stacks: TStacks, scope: TScope) =>
  Object.hasOwn(stacks, scope) ? (stacks[scope] ?? []) : [];
const push = (stacks: TStacks, scope: TScope, entry: TEntry): TStacks => ({
  ...stacks,
  [scope]: [...entries(stacks, scope).slice(1 - LIMIT), entry],
});
const pop = (stacks: TStacks, scope: TScope): TStacks => ({
  ...stacks,
  [scope]: entries(stacks, scope).slice(0, -1),
});
const top = (stacks: TStacks, scope: TScope) => entries(stacks, scope).at(-1);

// Ids whose name or pattern differ between the snapshot and the next project.
function changedIds(before: Project, after: Project) {
  const next = new Map(after.presets.map((preset) => [preset.id, preset]));
  return before.presets.flatMap((preset) => {
    const other = next.get(preset.id);
    return other && JSON.stringify(other) !== JSON.stringify(preset) ? [preset.id] : [];
  });
}

// Restores a project step: its preset list and map, but other presets keep their newer edits.
function restore(entry: Extract<TEntry, { kind: "project" }>, current: Project): Project {
  const live = new Map(current.presets.map((preset) => [preset.id, preset]));
  const touched = new Set(entry.touched);
  return {
    ...entry.project,
    map: entry.project.map,
    presets: entry.project.presets.map((preset) => {
      const now = live.get(preset.id);
      return now && !touched.has(preset.id) ? now : preset;
    }),
  };
}

const replacePreset = (project: Project, next: Preset): Project => ({
  ...project,
  presets: project.presets.map((preset) => (preset.id === next.id ? next : preset)),
});

export const arm = (state: IDocumentState): IDocumentState =>
  state.history.open === null ? state : { ...state, history: { ...state.history, open: null } };

export function edit(
  state: IDocumentState,
  scope: TScope,
  recipe: (project: Project) => Project,
): IDocumentState {
  const next = recipe(state.project);
  if (next === state.project) return state;
  const { history } = state;
  if (history.open === scope) {
    if (scope !== PROJECT_SCOPE) return { ...state, project: next };
    const entry = top(history.past, scope);
    if (entry?.kind !== "project") return { ...state, project: next };
    const touched = changedIds(entry.project, next);
    return {
      project: next,
      history: { ...history, past: push(pop(history.past, scope), scope, { ...entry, touched }) },
    };
  }
  const seq = history.seq + 1;
  let entry: TEntry;
  if (scope === PROJECT_SCOPE) {
    entry = {
      seq,
      kind: "project",
      project: state.project,
      touched: changedIds(state.project, next),
    };
  } else {
    const preset = state.project.presets.find((item) => item.id === scope);
    if (!preset) return { ...state, project: next };
    entry = { seq, kind: "pattern", preset };
  }
  const future = { ...history.future, [scope]: [], [PROJECT_SCOPE]: [] };
  return {
    project: next,
    history: { past: push(history.past, scope, entry), future, open: scope, seq },
  };
}

// The newest step between the current pattern and the project.
function pick(stacks: TStacks, presetId: string) {
  const own = top(stacks, presetId);
  const shared = top(stacks, PROJECT_SCOPE);
  if (own && (!shared || own.seq > shared.seq)) return presetId;
  return shared ? PROJECT_SCOPE : null;
}

function apply(state: IDocumentState, presetId: string, from: "past" | "future") {
  const to = from === "past" ? "future" : "past";
  const { history, project } = state;
  const scope = pick(history[from], presetId);
  const entry = scope && top(history[from], scope);
  if (!scope || !entry) return state;
  const seq = history.seq + 1;
  let inverse: TEntry;
  let next: Project;
  if (entry.kind === "pattern") {
    const current = project.presets.find((preset) => preset.id === entry.preset.id);
    if (!current) return state;
    inverse = { seq, kind: "pattern", preset: current };
    next = replacePreset(project, entry.preset);
  } else {
    inverse = { seq, kind: "project", project, touched: entry.touched };
    next = restore(entry, project);
  }
  return {
    project: next,
    history: {
      ...history,
      [from]: pop(history[from], scope),
      [to]: push(history[to], scope, inverse),
      open: null,
      seq,
    },
  };
}

export const undo = (state: IDocumentState, presetId: string) => apply(state, presetId, "past");
export const redo = (state: IDocumentState, presetId: string) => apply(state, presetId, "future");
export const canUndo = (history: IHistory, presetId: string) =>
  pick(history.past, presetId) !== null;
export const canRedo = (history: IHistory, presetId: string) =>
  pick(history.future, presetId) !== null;
