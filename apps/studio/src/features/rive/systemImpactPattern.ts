import type { TSystemImpact } from "@buzzzz/core";
import { pulsarPresets } from "@buzzzz/core/presets";

const names = {
  impactSoft: "SystemImpactSoft",
  impactLight: "SystemImpactLight",
  impactMedium: "SystemImpactMedium",
} satisfies Record<TSystemImpact, string>;

export function systemImpactPattern(impact: TSystemImpact) {
  return pulsarPresets.find(
    (preset) => preset.name === names[impact] && preset.tags.includes("iOS"),
  )?.pattern;
}
