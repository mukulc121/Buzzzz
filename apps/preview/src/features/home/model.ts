import type { RelayStatus } from "../connection/model";
import { colors } from "../../theme/colors";

export function deriveConnectionRow(status: RelayStatus) {
  switch (status) {
    case "connected":
      return { color: colors.green, label: "Tap to view haptics" };
    case "idle":
      return { color: colors.red, label: "Tap to view haptics" };
    case "connecting":
      return { color: colors.border, label: "Connecting…" };
    case "error":
      return { color: colors.red, label: "Couldn’t connect" };
  }
}

export function deriveConnectionInput(value: string, focused: boolean) {
  const expanded = focused || value !== "";
  return {
    fontSize: expanded ? 25 : 16,
    paddingVertical: expanded ? 12.5 : 18,
    placeholder: focused ? "" : "Connecting code",
  };
}

const support = [
  { name: "None", description: "Your device does not support haptics." },
  { name: "Limited", description: "Some presets may not work as expected on your device." },
  { name: "Standard", description: "Most presets are fully supported on your device." },
  { name: "Advanced", description: "All presets are fully supported on your device." },
];

export function deriveHapticsSupport(level: number) {
  return support[level] ?? support[0];
}
