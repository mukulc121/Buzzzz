import { isRecord, MAX_PATTERN_MS } from "../patterns/pattern.ts";

export type TSystemImpact = "impactSoft" | "impactLight" | "impactMedium";

export type TRiveHapticAction =
  | {
      kind: "sequence";
      immediate?: TSystemImpact;
      cues: { delayMs: number; preset: TSystemImpact }[];
      repeatMs?: number;
    }
  | { kind: "stop"; trigger: string };

export interface IRiveConfig {
  artboard?: string;
  viewModel?: string;
  nativeSound?: boolean;
  haptics?: Record<string, TRiveHapticAction>;
  completion?: {
    startTrigger: string;
    readyTrigger: string;
    readyAfterMs?: number;
    entryMs: number;
    loopPeriodMs: number;
    exitMs: number;
    marginMs: number;
  };
}

const name = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0 && value.length <= 512;

const impact = (value: unknown): value is TSystemImpact =>
  value === "impactSoft" || value === "impactLight" || value === "impactMedium";

const delay = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= MAX_PATTERN_MS;

const onlyKeys = (value: Record<string, unknown>, keys: readonly string[]) =>
  Object.keys(value).every((key) => keys.includes(key));

function isCompletion(value: unknown) {
  return (
    isRecord(value) &&
    onlyKeys(value, [
      "startTrigger",
      "readyTrigger",
      "readyAfterMs",
      "entryMs",
      "loopPeriodMs",
      "exitMs",
      "marginMs",
    ]) &&
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
    if (
      !isRecord(cue) ||
      !onlyKeys(cue, ["delayMs", "preset"]) ||
      !delay(cue.delayMs) ||
      !impact(cue.preset)
    )
      return false;
    lastDelay = Math.max(lastDelay, cue.delayMs);
  }
  return (
    value.repeatMs === undefined ||
    (delay(value.repeatMs) && value.repeatMs > 0 && value.repeatMs >= lastDelay)
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
  if (value.haptics === undefined) return true;
  if (!isRecord(value.haptics) || Object.keys(value.haptics).length > 32) return false;
  const actions = new Map<string, TRiveHapticAction>();
  for (const [trigger, action] of Object.entries(value.haptics)) {
    if (!name(trigger) || !isAction(action)) return false;
    actions.set(trigger, action);
  }
  return [...actions.values()].every(
    (action) => action.kind !== "stop" || actions.get(action.trigger)?.kind === "sequence",
  );
}
