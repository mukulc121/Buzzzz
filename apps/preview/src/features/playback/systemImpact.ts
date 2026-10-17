import type { TSystemImpact } from "@buzzzz/core";
import type { Presets } from "react-native-pulsar";

export function playSystemImpact(
  preset: TSystemImpact,
  system: Pick<typeof Presets.System, TSystemImpact>,
) {
  switch (preset) {
    case "impactSoft":
      system.impactSoft();
      return;
    case "impactLight":
      system.impactLight();
      return;
    case "impactMedium":
      system.impactMedium();
      return;
    default: {
      const exhaustive: never = preset;
      return exhaustive;
    }
  }
}
