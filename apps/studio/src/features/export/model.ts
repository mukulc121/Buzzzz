import { resolveRivePresetId, type Project } from "@buzzzz/core";

export interface IExportFiles {
  includeAudio: boolean;
  includeAnimation: boolean;
}

export interface IExportSelection extends IExportFiles {
  presetIds: readonly string[];
}

export function selectExportProject(project: Project, selection?: IExportSelection): Project {
  if (!selection) return project;
  const included = new Set(selection.presetIds);
  const presets = project.presets.filter((preset) => included.has(preset.id));
  if (!presets.length) throw new Error("Choose at least one pattern to export.");
  const ids = new Set(presets.map((preset) => preset.id));
  const owner = resolveRivePresetId(project);
  return {
    ...project,
    presets,
    map: Object.fromEntries(Object.entries(project.map).filter(([, id]) => ids.has(id))),
    rivePresetId: owner && ids.has(owner) ? owner : null,
    ...(owner && ids.has(owner) ? {} : { riveConfig: undefined, riveStateMachine: undefined }),
  };
}

export function exportName(project: Project, projectName: string) {
  return project.presets.length === 1
    ? project.presets[0].name
    : projectName.trim() || "Buzzzz pack";
}

export function exportLabel(selected: number, total: number) {
  const all = selected === total && total > 1 ? "all " : "";
  return `Export ${all}${selected} pattern${selected === 1 ? "" : "s"}`;
}
