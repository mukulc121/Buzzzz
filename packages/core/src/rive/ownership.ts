import type { Project } from "../patterns/project.ts";

export function resolveRivePresetId(project: Project): string | null {
  if (project.rivePresetId !== undefined) return project.rivePresetId;
  const dex = project.presets.find((preset) => preset.id === "dex-tour-loader");
  if (
    dex &&
    project.riveConfig?.viewModel === "ViewModel1" &&
    project.riveConfig.completion?.startTrigger === "hapticEntry"
  )
    return dex.id;
  return project.presets[0]?.id ?? null;
}
