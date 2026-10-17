import type { IRiveConfig } from "@buzzzz/core";

export function riveHapticAction(actions: IRiveConfig["haptics"], name: string) {
  return actions && Object.hasOwn(actions, name) ? actions[name] : undefined;
}
