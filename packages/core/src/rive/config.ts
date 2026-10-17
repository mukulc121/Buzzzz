import { isRecord, MAX_PATTERN_MS } from "../patterns/pattern.ts";

export type TSystemImpact = "impactSoft" | "impactLight" | "impactMedium";

export interface IRivePulsarTuning {
  timeScale: number;
  gain: number;
  sharpnessBoost: number;
}

export type TRiveCue =
  | { delayMs: number; preset: TSystemImpact }
  | { delayMs: number; pulsar: string; tuning?: IRivePulsarTuning };

export type TRiveHapticAction =
  | {
      kind: "sequence";
      immediate?: TSystemImpact;
      cues: TRiveCue[];
      repeatMs?: number;
    }
  | { kind: "stop"; trigger: string };

export interface IRiveConfig {
  artboard?: string;
  viewModel?: string;
  nativeSound?: boolean;
  haptics?: Record<string, TRiveHapticAction>;
  completion?: {
    clock?: "mount" | "play";
    startTrigger: string;
    readyTrigger: string;
    readyAfterMs?: number;
    entryMs: number;
    loopPeriodMs: number;
    exitMs: number;
    marginMs: number;
    phases?: {
      entry: string;
      loop: string;
      exit: string;
      exitLeadMs: number;
      markers?: string[];
    };
  };
}

const name = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0 && value.length <= 512;

const impact = (value: unknown): value is TSystemImpact =>
  value === "impactSoft" || value === "impactLight" || value === "impactMedium";

const delay = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= MAX_PATTERN_MS;

const pulsarName = (value: unknown): value is string =>
  typeof value === "string" && /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(value);

const within = (value: unknown, min: number, max: number) =>
  typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;

const onlyKeys = (value: Record<string, unknown>, keys: readonly string[]) =>
  Object.keys(value).every((key) => keys.includes(key));

function isCompletion(value: unknown) {
  return (
    isRecord(value) &&
    onlyKeys(value, [
      "clock",
      "startTrigger",
      "readyTrigger",
      "readyAfterMs",
      "entryMs",
      "loopPeriodMs",
      "exitMs",
      "marginMs",
      "phases",
    ]) &&
    (value.clock === undefined || value.clock === "mount" || value.clock === "play") &&
    (value.phases === undefined || isPhases(value.phases)) &&
    name(value.startTrigger) &&
    name(value.readyTrigger) &&
    (value.readyAfterMs === undefined || delay(value.readyAfterMs)) &&
    delay(value.entryMs) &&
    delay(value.loopPeriodMs) &&
    value.loopPeriodMs > 0 &&
    delay(value.exitMs) &&
    delay(value.marginMs)
  );
}

function isPhases(value: unknown) {
  return (
    isRecord(value) &&
    onlyKeys(value, ["entry", "loop", "exit", "exitLeadMs", "markers"]) &&
    (value.markers === undefined ||
      (Array.isArray(value.markers) && value.markers.length <= 8 && value.markers.every(name))) &&
    name(value.entry) &&
    name(value.loop) &&
    name(value.exit) &&
    delay(value.exitLeadMs)
  );
}

function isTuning(value: unknown) {
  return (
    isRecord(value) &&
    onlyKeys(value, ["timeScale", "gain", "sharpnessBoost"]) &&
    within(value.timeScale, 0.01, 10) &&
    within(value.gain, 0, 10) &&
    within(value.sharpnessBoost, -1, 1)
  );
}

function isCue(value: unknown): value is TRiveCue {
  if (!isRecord(value) || !delay(value.delayMs)) return false;
  if ("preset" in value) return onlyKeys(value, ["delayMs", "preset"]) && impact(value.preset);
  return (
    onlyKeys(value, ["delayMs", "pulsar", "tuning"]) &&
    pulsarName(value.pulsar) &&
    (value.tuning === undefined || isTuning(value.tuning))
  );
}

function isAction(value: unknown): value is TRiveHapticAction {
  if (!isRecord(value)) return false;
  if (value.kind === "stop") return onlyKeys(value, ["kind", "trigger"]) && name(value.trigger);
  if (
    value.kind !== "sequence" ||
    !onlyKeys(value, ["kind", "immediate", "cues", "repeatMs"]) ||
    (value.immediate !== undefined && !impact(value.immediate)) ||
    !Array.isArray(value.cues)
  )
    return false;
  const cues: readonly unknown[] = value.cues;
  const count = cues.length + Number(value.immediate !== undefined);
  if (!count || count > 64) return false;
  let lastDelay = 0;
  for (const cue of cues) {
    if (!isCue(cue)) return false;
    lastDelay = Math.max(lastDelay, cue.delayMs);
  }
  return (
    value.repeatMs === undefined ||
    (delay(value.repeatMs) && value.repeatMs >= 1 && value.repeatMs >= lastDelay)
  );
}

export function isRiveConfig(value: unknown): value is IRiveConfig {
  if (
    !isRecord(value) ||
    !onlyKeys(value, ["artboard", "viewModel", "nativeSound", "haptics", "completion"]) ||
    (value.artboard !== undefined && !name(value.artboard)) ||
    (value.viewModel !== undefined && !name(value.viewModel)) ||
    (value.nativeSound !== undefined && typeof value.nativeSound !== "boolean") ||
    (value.completion !== undefined && !isCompletion(value.completion))
  )
    return false;
  if (value.haptics === undefined)
    return (value.completion as IRiveConfig["completion"])?.phases === undefined;
  if (!isRecord(value.haptics) || Object.keys(value.haptics).length > 32) return false;
  const actions = new Map<string, TRiveHapticAction>();
  for (const [trigger, action] of Object.entries(value.haptics)) {
    if (!name(trigger) || !isAction(action)) return false;
    actions.set(trigger, action);
  }
  const sequence = (trigger: string) => actions.get(trigger)?.kind === "sequence";
  const phases = (value.completion as IRiveConfig["completion"])?.phases;
  return (
    [...actions.values()].every((action) => action.kind !== "stop" || sequence(action.trigger)) &&
    (!phases || [phases.entry, phases.loop, phases.exit].every(sequence))
  );
}
