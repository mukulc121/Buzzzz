import type { IRiveConfig } from "@buzzzz/core";

export function riveHapticAction(actions: IRiveConfig["haptics"], name: string) {
  return actions && Object.hasOwn(actions, name) ? actions[name] : undefined;
}

/** Row label for a trigger the config scripts: its phase and the presets it plays. */
export function riveHapticLabel(config: IRiveConfig | undefined, name: string) {
  if (config?.completion?.phases?.markers?.includes(name)) return "Phase marker";
  const action = riveHapticAction(config?.haptics, name);
  if (!action) return undefined;
  if (action.kind === "stop") return `Stops ${action.trigger}`;
  const phases = config?.completion?.phases;
  const presets = [
    ...new Set([
      ...(action.immediate ? [action.immediate] : []),
      ...action.cues.map((cue) => ("preset" in cue ? cue.preset : cue.pulsar)),
    ]),
  ].join(" + ");
  if (!phases) return `Rive-driven ${presets}`;
  const phase = (["entry", "loop", "exit"] as const).find((key) => phases[key] === name);
  return phase ? `${phase[0].toUpperCase()}${phase.slice(1)} · ${presets}` : presets;
}
