import { expect, test } from "bun:test";
import type { Project } from "@buzzzz/core";
import { duplicatePreset } from "../src/features/project/duplicatePreset";

test("duplicate preserves the full editor and pattern, replaces source identities, and shares no mutable values", () => {
  const project: Project = {
    presets: [
      {
        id: "pattern",
        name: "Fanfare",
        pattern: {
          discretePattern: [{ time: 100, amplitude: 0.8, frequency: 0.4 }],
          continuousPattern: { amplitude: [{ time: 0, value: 0.5 }], frequency: [] },
        },
        editor: {
          durationMs: 5187,
          range: { start: 200, end: 3000 },
          markers: [{ id: "marker", time: 1000, label: "Hit" }],
        },
      },
    ],
    map: { tap: "pattern" },
  };
  const before = structuredClone(project);
  const source = before.presets[0];
  if (!source.editor) throw new Error("Missing source editor");
  const ids = ["pattern", "new-pattern", "marker", "new-marker"];
  const copy = duplicatePreset(project, "pattern", () => ids.shift() ?? "unexpected");
  if (!copy?.editor) throw new Error("Missing duplicated editor");
  expect(copy).toEqual({
    ...source,
    id: "new-pattern",
    name: "Fanfare copy",
    editor: {
      ...source.editor,
      markers: [{ id: "new-marker", time: 1000, label: "Hit" }],
    },
  });
  copy.pattern.discretePattern[0].amplitude = 0.1;
  copy.pattern.continuousPattern.amplitude[0].value = 0.2;
  copy.editor.markers[0].label = "Changed";
  if (copy.editor.range) copy.editor.range.start = 500;
  expect(project).toEqual(before);
  expect(duplicatePreset(project, "missing")).toBeNull();
});
