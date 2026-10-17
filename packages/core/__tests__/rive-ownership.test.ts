import { expect, test } from "bun:test";
import { emptyPattern, isProject, resolveRivePresetId, type Project } from "../src/index.ts";
import { DEX_RIVE_CONFIG_1063 as DEX_RIVE_CONFIG } from "../../../apps/studio/src/features/project/starter/rive/dex-rive-config-1063.ts";

const project: Project = {
  presets: [
    { id: "original", name: "Original", pattern: emptyPattern() },
    { id: "dex-tour-loader", name: "Renamed loader", pattern: emptyPattern() },
  ],
  map: {},
  riveConfig: DEX_RIVE_CONFIG,
};

test("the original Rive starter resolves its one owner without recreating the project", () => {
  expect(resolveRivePresetId(project)).toBe("dex-tour-loader");
  expect(resolveRivePresetId({ ...project, riveConfig: undefined })).toBe("original");
  expect(resolveRivePresetId({ ...project, rivePresetId: "original" })).toBe("original");
  expect(resolveRivePresetId({ ...project, rivePresetId: null })).toBeNull();
});

test("Rive ownership accepts legacy projects and explicit detachment but rejects missing owners", () => {
  for (const rivePresetId of [undefined, null, "original", "dex-tour-loader"])
    expect(isProject({ ...project, rivePresetId })).toBe(true);
  for (const rivePresetId of ["", "missing", 42, {}, "x".repeat(513)])
    expect(isProject({ ...project, rivePresetId })).toBe(false);
});
