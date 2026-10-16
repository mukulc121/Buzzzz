import { expect, test } from "bun:test";
import type { Project } from "@buzzzz/core";
import * as history from "../src/features/project/history";

const pattern = (amplitude: number) => ({
  discretePattern: [{ time: 0, amplitude, frequency: 0.5 }],
  continuousPattern: { amplitude: [], frequency: [] },
});
const project = (): Project => ({
  presets: [
    { id: "a", name: "A", pattern: pattern(0.1) },
    { id: "b", name: "B", pattern: pattern(0.2) },
  ],
  map: {},
});
const setAmp = (id: string, amplitude: number) => (pr: Project) => ({
  ...pr,
  presets: pr.presets.map((p) => (p.id === id ? { ...p, pattern: pattern(amplitude) } : p)),
});
const amp = (state: history.IDocumentState, id: string) =>
  state.project.presets.find((p) => p.id === id)?.pattern.discretePattern[0].amplitude;
const ids = (state: history.IDocumentState) => state.project.presets.map((p) => p.id);
const edit = (state: history.IDocumentState, id: string, value: number) =>
  history.edit(history.arm(state), id, setAmp(id, value));

test("a drag after one begin is a single undo step", () => {
  let state = history.arm(history.startDocument(project()));
  for (const value of [0.3, 0.4, 0.5]) state = history.edit(state, "a", setAmp("a", value));
  state = history.undo(state, "a");
  expect(amp(state, "a")).toBe(0.1);
  expect(history.canUndo(state.history, "a")).toBe(false);
  expect(amp(history.redo(state, "a"), "a")).toBe(0.5);
});

test("patterns keep independent histories", () => {
  let state = edit(history.startDocument(project()), "a", 0.9);
  state = edit(state, "b", 0.8);
  state = history.undo(state, "a");
  expect(amp(state, "a")).toBe(0.1);
  expect(amp(state, "b")).toBe(0.8);
  expect(history.canUndo(state.history, "a")).toBe(false);
  expect(history.canUndo(state.history, "b")).toBe(true);
});

test("undoing an added pattern keeps later edits in other patterns", () => {
  const added = { id: "c", name: "C", pattern: pattern(0.3) };
  let state = history.edit(history.startDocument(project()), history.PROJECT_SCOPE, (pr) => ({
    ...pr,
    presets: [...pr.presets, added],
  }));
  state = edit(state, "b", 0.7);
  state = history.undo(state, "a");
  expect(ids(state)).toEqual(["a", "b"]);
  expect(amp(state, "b")).toBe(0.7);
  state = history.redo(state, "a");
  expect(ids(state)).toEqual(["a", "b", "c"]);
});

test("removing then undoing restores the pattern, its triggers and its content", () => {
  let state = history.startDocument({ ...project(), map: { tap: "b" } });
  state = edit(state, "b", 0.6);
  state = history.edit(history.arm(state), history.PROJECT_SCOPE, (pr) => ({
    presets: pr.presets.filter((p) => p.id !== "b"),
    map: {},
  }));
  state = edit(state, "a", 0.4);
  state = history.undo(state, "a");
  expect(amp(state, "a")).toBe(0.1);
  state = history.undo(state, "a");
  expect(ids(state)).toEqual(["a", "b"]);
  expect(state.project.map).toEqual({ tap: "b" });
  expect(amp(state, "b")).toBe(0.6);
  expect(amp(history.undo(state, "b"), "b")).toBe(0.2);
});

test("an import undoes as a whole and redoes with the imported patterns", () => {
  const imported: Project = { presets: [{ id: "x", name: "X", pattern: pattern(1) }], map: {} };
  let state = history.edit(history.startDocument(project()), history.PROJECT_SCOPE, () => imported);
  state = edit(state, "x", 0.5);
  state = history.undo(state, "x");
  state = history.undo(state, "x");
  expect(ids(state)).toEqual(["a", "b"]);
  state = history.redo(state, "a");
  expect(ids(state)).toEqual(["x"]);
  expect(amp(history.redo(state, "x"), "x")).toBe(0.5);
});

test("project steps that change a pattern revert that pattern only", () => {
  let state = edit(history.startDocument(project()), "a", 0.9);
  state = history.edit(history.arm(state), history.PROJECT_SCOPE, (pr) => ({
    ...setAmp("b", 0.1)(pr),
    map: { tap: "b" },
  }));
  state = history.undo(state, "a");
  expect(state.project.map).toEqual({});
  expect(amp(state, "b")).toBe(0.2);
  expect(amp(state, "a")).toBe(0.9);
});

test("a new edit clears redo for that pattern only", () => {
  let state = edit(edit(history.startDocument(project()), "a", 0.9), "b", 0.8);
  state = history.undo(history.undo(state, "a"), "b");
  state = edit(state, "a", 0.3);
  expect(history.canRedo(state.history, "a")).toBe(false);
  expect(history.canRedo(state.history, "b")).toBe(true);
});

test("history keeps the last 100 steps per pattern", () => {
  let state = history.startDocument(project());
  for (let index = 1; index <= 120; index++) state = edit(state, "a", index / 1000);
  let undone = 0;
  while (history.canUndo(state.history, "a")) {
    state = history.undo(state, "a");
    undone++;
  }
  expect(undone).toBe(100);
  expect(amp(state, "a")).toBe(0.02);
});

test("untrusted pattern IDs cannot collide with prototypes or the project history scope", () => {
  for (const id of ["constructor", "__proto__", "toString", "#project"]) {
    let state = history.startDocument({
      presets: [{ id, name: "Pattern", pattern: pattern(0.1) }],
      map: {},
    });
    expect(history.canUndo(state.history, id)).toBe(false);
    state = edit(state, id, 0.9);
    expect(history.canUndo(state.history, id)).toBe(true);
    state = history.undo(state, id);
    expect(amp(state, id)).toBe(0.1);
    state = history.redo(state, id);
    expect(amp(state, id)).toBe(0.9);
  }
});
