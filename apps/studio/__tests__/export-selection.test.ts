import { expect, test } from "bun:test";
import { emptyPattern, isProject, type Project } from "@buzzzz/core";
import { exportLabel, exportName, selectExportProject } from "../src/features/export/model";

const project: Project = {
  presets: [
    { id: "one", name: "First", pattern: emptyPattern() },
    { id: "two", name: "Second", pattern: emptyPattern() },
  ],
  map: { A: "one", B: "two" },
  riveStateMachine: "Main",
};

test("selected exports retain project ordering, valid mappings and Rive configuration", () => {
  const selected = selectExportProject(project, {
    presetIds: ["two", "two", "unknown"],
    includeAudio: false,
    includeAnimation: true,
  });
  expect(selected.presets.map((preset) => preset.id)).toEqual(["two"]);
  expect(selected.map).toEqual({ B: "two" });
  expect(selected.riveStateMachine).toBe("Main");
  expect(isProject(selected)).toBe(true);
  expect(project.presets).toHaveLength(2);
  expect(project.map).toEqual({ A: "one", B: "two" });
  expect(selectExportProject(project)).toBe(project);
  expect(() =>
    selectExportProject(project, { presetIds: [], includeAudio: true, includeAnimation: true }),
  ).toThrow("Choose at least one pattern");
});

test("export names and counts follow the source single-pattern and pack labels", () => {
  expect(exportName(project, "  Demo pack  ")).toBe("Demo pack");
  expect(exportName(project, "  ")).toBe("Buzzzz pack");
  expect(exportName({ ...project, presets: [project.presets[1]] }, "Demo pack")).toBe("Second");
  expect(exportLabel(0, 2)).toBe("Export 0 patterns");
  expect(exportLabel(1, 2)).toBe("Export 1 pattern");
  expect(exportLabel(2, 2)).toBe("Export all 2 patterns");
  expect(exportLabel(1, 1)).toBe("Export 1 pattern");
});
