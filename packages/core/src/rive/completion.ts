import type { IRiveConfig } from "./config.ts";

interface IRiveCompletion<TTimer> {
  completion: IRiveConfig["completion"];
  now?: () => number;
  schedule: (callback: () => void, delayMs: number) => TTimer;
  cancel: (timer: TTimer) => void;
  fireTrigger?: (name: string) => void;
  onComplete: () => void;
}

export function createRiveCompletion<TTimer>(options: IRiveCompletion<TTimer>) {
  const { completion, now = Date.now } = options;
  const timers = new Set<TTimer>();
  let startedAt: number | null = null;
  let ready = false;
  let armed = false;
  let completed = false;
  let generation = 0;
  let automatic: { timer: TTimer } | null = null;
  const clearTimers = () => {
    generation++;
    for (const timer of timers) options.cancel(timer);
    timers.clear();
    automatic = null;
  };
  const stop = () => {
    clearTimers();
    startedAt = null;
    ready = false;
    armed = false;
    completed = false;
  };
  const later = (delayMs: number, callback: () => void) => {
    const token = generation;
    const timer = options.schedule(() => {
      timers.delete(timer);
      if (token === generation) callback();
    }, delayMs);
    timers.add(timer);
    return timer;
  };
  const trigger = (name: string) => {
    if (!completion || completed) return;
    if (name === completion.readyTrigger && !ready) {
      ready = true;
      if (automatic) {
        options.cancel(automatic.timer);
        timers.delete(automatic.timer);
        automatic = null;
      }
    }
    if (name === completion.startTrigger && startedAt === null) {
      startedAt = now();
      if (!ready && completion.readyAfterMs !== undefined && options.fireTrigger)
        automatic = {
          timer: later(completion.readyAfterMs, () => {
            automatic = null;
            if (!ready && !completed) options.fireTrigger?.(completion.readyTrigger);
          }),
        };
    }
    if (startedAt === null || !ready || armed) return;
    armed = true;
    const elapsed = now() - startedAt;
    const loops = Math.ceil((elapsed - completion.entryMs) / completion.loopPeriodMs);
    const exitStartsAt = completion.entryMs + Math.max(1, loops) * completion.loopPeriodMs;
    const delayMs = Math.max(0, exitStartsAt - elapsed) + completion.exitMs + completion.marginMs;
    later(delayMs, () => {
      completed = true;
      clearTimers();
      options.onComplete();
    });
  };
  return { trigger, stop, completed: () => completed };
}
