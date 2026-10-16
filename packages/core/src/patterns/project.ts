import { isPattern, isRecord, type Pattern } from "./pattern.ts";
export type Preset = { id: string; name: string; pattern: Pattern };
export type Project = { presets: Preset[]; map: Record<string, string> };
export function isProject(value: unknown): value is Project {
  if (
    !isRecord(value) ||
    !Array.isArray(value.presets) ||
    value.presets.length === 0 ||
    value.presets.length > 1000 ||
    !isRecord(value.map)
  )
    return false;
  const ids = new Set<string>();
  for (const preset of value.presets) {
    if (
      !isRecord(preset) ||
      typeof preset.id !== "string" ||
      !preset.id ||
      ids.has(preset.id) ||
      typeof preset.name !== "string" ||
      preset.name.length > 512 ||
      !isPattern(preset.pattern)
    )
      return false;
    ids.add(preset.id);
  }
  return Object.entries(value.map).every(
    ([name, id]) => name.length <= 512 && typeof id === "string" && ids.has(id),
  );
}
