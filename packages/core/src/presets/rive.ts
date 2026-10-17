import type { IRiveConfig, TRiveCue, TSystemImpact } from "../rive/config.ts";
import { patternEnd, type Pattern } from "../patterns/pattern.ts";
import { pulsarPresets } from "./catalog.ts";

const SYSTEM_IMPACTS = {
  impactSoft: "SystemImpactSoft",
  impactLight: "SystemImpactLight",
  impactMedium: "SystemImpactMedium",
} satisfies Record<TSystemImpact, string>;

type TPhase = "entry" | "loop" | "exit";

const MAX_OCCURRENCES = 10_000;

function presetPattern(name: string, ios: boolean) {
  return pulsarPresets.find(
    (preset) => preset.name === name && (!ios || preset.tags.includes("iOS")),
  )?.pattern;
}

/** The real pattern a cue plays: a Pulsar preset, scaled the way Dex's `scalePattern` does. */
export function riveCuePattern(cue: TRiveCue): Pattern | undefined {
  if ("preset" in cue) return presetPattern(SYSTEM_IMPACTS[cue.preset], true);
  const pattern = presetPattern(cue.pulsar, false);
  if (!pattern || !cue.tuning) return pattern;
  const { timeScale, gain, sharpnessBoost } = cue.tuning;
  const time = (ms: number) => Math.round(ms * timeScale);
  const unit = (value: number) => Math.max(0, Math.min(1, value));
  const amplitude = (value: number) => unit(value * gain);
  const frequency = (value: number) => unit(value + sharpnessBoost);
  return {
    discretePattern: pattern.discretePattern.map((tap) => ({
      time: time(tap.time),
      amplitude: amplitude(tap.amplitude),
      frequency: frequency(tap.frequency),
    })),
    continuousPattern: {
      amplitude: pattern.continuousPattern.amplitude.map((point) => ({
        time: time(point.time),
        value: amplitude(point.value),
      })),
      frequency: pattern.continuousPattern.frequency.map((point) => ({
        time: time(point.time),
        value: frequency(point.value),
      })),
    },
  };
}

interface IRiveOccurrence {
  phase: TPhase;
  trigger: string;
  timeMs: number;
  durationMs: number;
  cue: TRiveCue;
  pattern: Pattern;
}

/** Every pattern a clock-owned profile plays, on the play clock, for a scene that turns ready at `readyAtMs`. */
export function riveProfileOccurrences(config: IRiveConfig, options: { readyAtMs?: number } = {}) {
  const completion = config.completion;
  const phases = completion?.phases;
  if (!completion || !phases || !config.haptics) return undefined;
  const { entryMs, loopPeriodMs, exitMs, marginMs } = completion;
  const readyAtMs = options.readyAtMs ?? completion.readyAfterMs ?? entryMs;
  const loops = Math.ceil((readyAtMs - entryMs) / loopPeriodMs);
  const exitAtMs = entryMs + Math.max(1, loops) * loopPeriodMs;
  const durationMs = exitAtMs + exitMs + marginMs;
  const exitStartMs = Math.max(readyAtMs, exitAtMs - phases.exitLeadMs);
  const occurrences: IRiveOccurrence[] = [];
  const add = (phase: TPhase, startMs: number, endMs: number) => {
    const trigger = phases[phase];
    const action = config.haptics?.[trigger];
    if (action?.kind !== "sequence") return true;
    const push = (timeMs: number, cue: TRiveCue) => {
      const pattern = riveCuePattern(cue);
      if (timeMs >= endMs || !pattern) return;
      const length = patternEnd(pattern);
      // A loop pattern is cut when the next phase starts.
      const clip = phase === "loop" ? endMs - timeMs : length;
      occurrences.push({
        phase,
        trigger,
        timeMs,
        durationMs: Math.min(length, clip),
        cue,
        pattern,
      });
    };
    if (action.immediate) push(startMs, { delayMs: 0, preset: action.immediate });
    if (!action.cues.length) return true;
    for (let cycle = 0; ; cycle++) {
      const cycleMs = startMs + cycle * (action.repeatMs ?? 0);
      if (cycleMs >= endMs) break;
      // Too many to render is reported as no timeline, never a partial one.
      if (cycle >= MAX_OCCURRENCES || occurrences.length > MAX_OCCURRENCES) return false;
      for (const cue of action.cues) push(cycleMs + cue.delayMs, cue);
      if (action.repeatMs === undefined) break;
    }
    return true;
  };
  if (
    !add("entry", 0, Math.min(entryMs, exitStartMs)) ||
    !add("loop", entryMs, exitStartMs) ||
    !add("exit", exitStartMs, durationMs) ||
    occurrences.length > MAX_OCCURRENCES
  )
    return undefined;
  return {
    durationMs,
    readyAtMs,
    exitAtMs,
    occurrences: occurrences.sort((a, b) => a.timeMs - b.timeMs),
  };
}
