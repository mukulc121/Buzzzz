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
  let entryEndsAt: number | null = null;
  let exitAt: number | null = null;
  let endsAt: number | null = null;
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
    entryEndsAt = null;
    exitAt = null;
    endsAt = null;
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
  const expired = (name: string) => {
    const deadline = name === phases?.entry ? entryEndsAt : name === phases?.loop ? exitAt : endsAt;
    return deadline !== null && clock.now() >= deadline;
  };
  const dispatch = (name: string, action: TRiveHapticAction, startedAt = clock.now()) => {
    if (action.kind === "stop") {
      if (owner === action.trigger) stopPhase();
      return;
    }
    stopPhase();
    if (!options.canPlay()) return;
    owner = name;
    const token = generation;
    const active = () => token === generation && options.canPlay() && !expired(name);
    const schedule = (delayMs: number, callback: () => void) => {
      const timer = clock.schedule(() => {
        timers.delete(timer);
        if (active()) callback();
      }, delayMs);
      timers.add(timer);
    };
    // Clock-owned phases play their zero-delay cues inline, as Dex's cycle() does.
    const inline = isPhase(name);
    const cycle = (cycleAt: number) => {
      if (!active()) return;
      const repeat = action.repeatMs;
      if (inline && repeat !== undefined)
        cycleAt += Math.max(0, Math.floor((clock.now() - cycleAt) / repeat)) * repeat;
      const cycleEnd = repeat === undefined ? Infinity : cycleAt + repeat;
      for (const cue of action.cues) {
        if (!active()) return;
        const cueAt = cycleAt + cue.delayMs;
        const play = () => {
          if (!inline || clock.now() < cycleEnd || clock.now() === cueAt) playCue(cue);
        };
        if (inline && cueAt <= clock.now()) play();
        else schedule(Math.max(0, cueAt - clock.now()), play);
      }
      if (repeat !== undefined)
        schedule(Math.max(0, cycleEnd - clock.now()), () => cycle(inline ? cycleEnd : clock.now()));
    };
    if (action.immediate !== undefined) options.play(action.immediate);
    cycle(startedAt);
  };
  const startPhase = (name: string, startedAt: number) => {
    const action = options.haptics?.[name];
    if (owner === name || !action || completion.completed() || expired(name)) return;
    dispatch(name, action, startedAt);
  };
  const completion = createRiveCompletion({
    completion: options.completion,
    now: clock.now,
    schedule: clock.schedule,
    cancel: (cancel) => cancel(),
    fireTrigger: options.fireTrigger,
    onStart: () => {
      if (!phases) return;
      const startedAt = clock.now();
      const loopAt = startedAt + (options.completion?.entryMs ?? 0);
      entryEndsAt = loopAt;
      // Timers wait out a pause, so a scene bound while paused still gets its entry.
      later(0, () => startPhase(phases.entry, startedAt));
      later(options.completion?.entryMs ?? 0, () => {
        if (!exitStarted) startPhase(phases.loop, loopAt);
      });
    },
    onExitStart: (delayMs) => {
      endsAt =
        clock.now() +
        delayMs +
        (options.completion?.exitMs ?? 0) +
        (options.completion?.marginMs ?? 0);
      if (!phases) return;
      const phaseAt = clock.now() + Math.max(0, delayMs - phases.exitLeadMs);
      exitAt = phaseAt;
      later(Math.max(0, delayMs - phases.exitLeadMs), () => {
        exitStarted = true;
        startPhase(phases.exit, phaseAt);
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
    if (completion.completed() || !action || isPhase(name) || expired(name)) return;
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
