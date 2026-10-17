import type { IRiveConfig, TRiveCue, TRiveHapticAction, TSystemImpact } from "./config.ts";
import { createRiveCompletion } from "./completion.ts";
import { createRiveTimers } from "./timers.ts";

type TPulsarCue = Extract<TRiveCue, { pulsar: string }>;

interface IRiveHaptics<TTimer> {
  play: (preset: TSystemImpact) => void;
  playPulsar?: (cue: TPulsarCue) => void;
  stopPulsar?: () => void;
  canPlay: () => boolean;
  schedule: (callback: () => void, delayMs: number) => TTimer;
  cancel: (timer: TTimer) => void;
  completion?: IRiveConfig["completion"];
  haptics?: IRiveConfig["haptics"];
  now?: () => number;
  fireTrigger?: (name: string) => void;
  onComplete?: () => void;
}

export function createRiveHaptics<TTimer>(options: IRiveHaptics<TTimer>) {
  const clock = createRiveTimers(options);
  const timers = new Set<() => void>();
  const timeline = new Set<() => void>();
  const phases = options.completion?.phases;
  let owner: string | null = null;
  let generation = 0;
  let patternPlaying = false;
  let exitStarted = false;
  const stopPhase = () => {
    generation++;
    for (const cancel of timers) cancel();
    timers.clear();
    owner = null;
    // Core Haptics may reorder a stop and a play sent together, so only stop a pattern that is playing.
    if (patternPlaying) options.stopPulsar?.();
    patternPlaying = false;
  };
  const stopTimeline = () => {
    for (const cancel of timeline) cancel();
    timeline.clear();
    exitStarted = false;
  };
  const later = (delayMs: number, callback: () => void) => {
    const cancel = clock.schedule(() => {
      timeline.delete(cancel);
      callback();
    }, delayMs);
    timeline.add(cancel);
  };
  const playCue = (cue: TRiveCue) => {
    if ("preset" in cue) {
      options.play(cue.preset);
      return;
    }
    if (cue.tuning) patternPlaying = true;
    options.playPulsar?.(cue);
  };
  const dispatch = (name: string, action: TRiveHapticAction) => {
    if (action.kind === "stop") {
      if (owner === action.trigger) stopPhase();
      return;
    }
    stopPhase();
    if (!options.canPlay()) return;
    owner = name;
    const token = generation;
    const schedule = (delayMs: number, callback: () => void) => {
      const timer = clock.schedule(() => {
        timers.delete(timer);
        if (token === generation && options.canPlay()) callback();
      }, delayMs);
      timers.add(timer);
    };
    // Clock-owned phases play their zero-delay cues inline, as Dex's cycle() does.
    const inline = isPhase(name);
    const cycle = () => {
      for (const cue of action.cues)
        if (inline && cue.delayMs === 0) playCue(cue);
        else schedule(cue.delayMs, () => playCue(cue));
      if (action.repeatMs !== undefined) schedule(action.repeatMs, cycle);
    };
    if (action.immediate !== undefined) options.play(action.immediate);
    cycle();
  };
  const startPhase = (name: string) => {
    const action = options.haptics?.[name];
    if (owner === name || !action || completion.completed()) return;
    dispatch(name, action);
  };
  const completion = createRiveCompletion({
    completion: options.completion,
    now: clock.now,
    schedule: clock.schedule,
    cancel: (cancel) => cancel(),
    fireTrigger: options.fireTrigger,
    onStart: () => {
      if (!phases) return;
      // Timers wait out a pause, so a scene bound while paused still gets its entry.
      later(0, () => startPhase(phases.entry));
      later(options.completion?.entryMs ?? 0, () => {
        if (!exitStarted) startPhase(phases.loop);
      });
    },
    onExitStart: (delayMs) => {
      if (!phases) return;
      later(Math.max(0, delayMs - phases.exitLeadMs), () => {
        exitStarted = true;
        startPhase(phases.exit);
      });
    },
    onComplete: () => {
      stopPhase();
      stopTimeline();
      options.onComplete?.();
    },
  });
  const isPhase = (name: string) =>
    phases !== undefined &&
    (name === phases.entry ||
      name === phases.loop ||
      name === phases.exit ||
      !!phases.markers?.includes(name));
  const stop = () => {
    stopPhase();
    stopTimeline();
    completion.stop();
    clock.stop();
  };
  const trigger = (name: string, action?: TRiveHapticAction) => {
    if (clock.paused()) return;
    completion.trigger(name);
    // Phase and marker triggers are breadcrumbs once the clock owns the phases.
    if (completion.completed() || !action || isPhase(name)) return;
    dispatch(name, action);
  };
  return {
    trigger,
    stop,
    stopImpacts: stopPhase,
    mount: () => {
      stop();
      completion.mount();
    },
    bind: completion.bind,
    pause: clock.pause,
    resume: clock.resume,
    completed: completion.completed,
    elapsedMs: completion.elapsedMs,
    ownsPhase: isPhase,
  };
}
