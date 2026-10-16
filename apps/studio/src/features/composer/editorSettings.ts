export type GridDensity = "off" | "sparse" | "normal" | "dense";
export interface IEditorSettings {
  gridDensity: GridDensity;
  valueDecimals: 0 | 1 | 2;
  crosshair: boolean;
  timeCursor: boolean;
  multilayerSelection: boolean;
}
export const DEFAULT_EDITOR_SETTINGS: IEditorSettings = {
  gridDensity: "normal",
  valueDecimals: 1,
  crosshair: true,
  timeCursor: true,
  multilayerSelection: true,
};
export function parseEditorSettings(raw: string | null): IEditorSettings {
  const result = { ...DEFAULT_EDITOR_SETTINGS };
  if (!raw) return result;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return result;
    if (
      "gridDensity" in value &&
      (value.gridDensity === "off" ||
        value.gridDensity === "sparse" ||
        value.gridDensity === "normal" ||
        value.gridDensity === "dense")
    )
      result.gridDensity = value.gridDensity;
    if (
      "valueDecimals" in value &&
      (value.valueDecimals === 0 || value.valueDecimals === 1 || value.valueDecimals === 2)
    )
      result.valueDecimals = value.valueDecimals;
    if ("crosshair" in value && typeof value.crosshair === "boolean")
      result.crosshair = value.crosshair;
    if ("timeCursor" in value && typeof value.timeCursor === "boolean")
      result.timeCursor = value.timeCursor;
    if ("multilayerSelection" in value && typeof value.multilayerSelection === "boolean")
      result.multilayerSelection = value.multilayerSelection;
  } catch {
    return result;
  }
  return result;
}
export function quantizeValue(value: number, decimals: number): number {
  const scale = 100 * 10 ** decimals;
  return Math.max(0, Math.min(1, Math.round(value * scale) / scale));
}
