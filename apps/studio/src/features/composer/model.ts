export type Layer = "amplitude" | "frequency" | "discrete";
export type Selection = { layer: Layer; index: number } | null;
export const COLORS: Record<Layer, string> = {
  amplitude: "var(--amp)",
  frequency: "var(--freq)",
  discrete: "var(--tap)",
};
