import type { IRiveConfig, TRiveHapticAction, TSystemImpact } from "./config.ts";
import { createRiveCompletion } from "./completion.ts";
import { createRiveTimers } from "./timers.ts";

interface IRiveHaptics<TTimer> {
  play: (preset: TSystemImpact) => void;
  canPlay: () => boolean;
  schedule: (callback: () => void, delayMs: number) => TTimer;
  cancel: (timer: TTimer) => void;
  completion?: IRiveConfig["completion"];
  now?: () => number;
  fireTrigger?: (name: string) => void;
  onComplete?: () => void;
}

export function createRiveHaptics<TTimer>(options: IRiveHaptics<TTimer>) {
  const clock = createRiveTimers(options);
  const timers = new Set<() => void>();
  let owner: string | null = null;
  let generation = 0;
  const stopPhase = () => {
    generation++;
    for (const cancel of timers) cancel();
    timers.clear();
    owner = null;
  };
  const completion = createRiveCompletion({
    completion: options.completion,
    now: clock.now,
    schedule: clock.schedule,
    cancel: (cancel) => cancel(),
    fireTrigger: options.fireTrigger,
    onComplete: () => {
      stopPhase();
      options.onComplete?.();
    },
  });
  const stop = () => {
    stopPhase();
    completion.stop();
    clock.stop();
  };
  const trigger = (name: string, action?: TRiveHapticAction) => {
    if (clock.paused()) return;
    completion.trigger(name);
    if (completion.completed() || !action) return;
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
    const cycle = () => {
      for (const cue of action.cues) schedule(cue.delayMs, () => options.play(cue.preset));
      if (action.repeatMs !== undefined) schedule(action.repeatMs, cycle);
    };
    if (action.immediate !== undefined) options.play(action.immediate);
    cycle();
  };
  return {
    trigger,
    stop,
    pause: clock.pause,
    resume: clock.resume,
    completed: completion.completed,
  };
}
