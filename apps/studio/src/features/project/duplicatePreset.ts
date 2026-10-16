import type { Preset, Project } from "@buzzzz/core";
import { uid } from "./model";

export function duplicatePreset(project: Project, presetId: string, createId = uid): Preset | null {
  const source = project.presets.find((preset) => preset.id === presetId);
  if (!source) return null;
  const used = new Set(
    project.presets.flatMap((preset) => [
      preset.id,
      ...(preset.editor?.markers.map((marker) => marker.id) ?? []),
    ]),
  );
  const freshId = () => {
    let id = createId();
    while (used.has(id)) id = createId();
    used.add(id);
    return id;
  };
  const copy = structuredClone(source);
  copy.id = freshId();
  copy.name = `${source.name} copy`;
  if (copy.editor)
    copy.editor.markers = copy.editor.markers.map((marker) => ({ ...marker, id: freshId() }));
  return copy;
}
