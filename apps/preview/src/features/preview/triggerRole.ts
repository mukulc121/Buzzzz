import type { IRiveConfig } from "@buzzzz/core";

export type TTriggerRole = "haptic" | "control" | "unmapped";

export function deriveTriggerRole(
  name: string,
  mappedNames: readonly string[],
  config: IRiveConfig | undefined,
): TTriggerRole {
  if (mappedNames.includes(name)) return "haptic";
  return config?.completion?.readyTrigger === name ? "control" : "unmapped";
}
