import { isPattern, isRecord, type Pattern } from "../patterns/pattern.ts";

interface ILibraryPreset {
  resourceId: string;
  name: string;
}

export type LibraryMsg =
  | { type: "library-manifest"; presets: ILibraryPreset[] }
  | { type: "library-manifest-request" }
  | { type: "haptic-preset"; resourceId: string; name: string; version: string; pattern: Pattern };

const text = (value: unknown): value is string => typeof value === "string" && value.length <= 512;
const resourceId = (value: unknown): value is string => text(value) && value.length > 0;
const isPreset = (value: unknown): value is ILibraryPreset =>
  isRecord(value) && resourceId(value.resourceId) && text(value.name);

export function parseLibraryMessage(value: Record<string, unknown>): LibraryMsg | null {
  switch (value.type) {
    case "library-manifest": {
      const presets = value.presets;
      if (!Array.isArray(presets) || presets.length > 1000 || !presets.every(isPreset)) return null;
      if (new Set(presets.map((preset) => preset.resourceId)).size !== presets.length) return null;
      return {
        type: "library-manifest",
        presets: presets.map((preset) => ({ resourceId: preset.resourceId, name: preset.name })),
      };
    }
    case "library-manifest-request":
      return { type: "library-manifest-request" };
    case "haptic-preset":
      if (
        !resourceId(value.resourceId) ||
        !text(value.name) ||
        typeof value.version !== "string" ||
        !/^[0-9a-f]{64}$/.test(value.version) ||
        !isPattern(value.pattern)
      )
        return null;
      return {
        type: "haptic-preset",
        resourceId: value.resourceId,
        name: value.name,
        version: value.version,
        pattern: value.pattern,
      };
    default:
      return null;
  }
}
