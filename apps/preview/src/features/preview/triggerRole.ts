import type { IRiveConfig } from "@buzzzz/core";

export type TTriggerRole = "haptic" | "control" | "unmapped";

export function deriveTriggerRole(
  name: string,
  mappedNames: readonly string[],
  config: IRiveConfig | undefined,
): TTriggerRole {
  const phases = config?.completion?.phases;
  if (
    mappedNames.includes(name) ||
    (phases && [phases.entry, phases.loop, phases.exit, ...(phases.markers ?? [])].includes(name))
  )
    return "haptic";
  return config?.completion?.readyTrigger === name ? "control" : "unmapped";
}
