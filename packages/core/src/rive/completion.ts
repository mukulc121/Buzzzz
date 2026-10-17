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
  let completedAt: number | null = null;
  let generation = 0;
  let automatic: { timer: TTimer } | null = null;
  let mounted = false;
  let bound = false;
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
    completedAt = null;
    mounted = false;
    bound = false;
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
  const scheduleReady = () => {
    if (
      !completion ||
      startedAt === null ||
      ready ||
      automatic ||
      completion.readyAfterMs === undefined ||
      !options.fireTrigger
    )
      return;
    automatic = {
      timer: later(Math.max(0, completion.readyAfterMs - (now() - startedAt)), () => {
        automatic = null;
        if (!ready && !completed) options.fireTrigger?.(completion.readyTrigger);
      }),
    };
  };
  const mount = () => {
    if (completion?.clock !== "mount" || startedAt !== null) return;
    mounted = true;
    startedAt = now();
    if (bound) scheduleReady();
  };
  const bind = () => {
    if (bound) return;
    bound = true;
    if (mounted) scheduleReady();
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
      scheduleReady();
    }
    if (startedAt === null || !ready || armed) return;
    armed = true;
    const elapsed = now() - startedAt;
    const loops = Math.ceil((elapsed - completion.entryMs) / completion.loopPeriodMs);
    const exitStartsAt = completion.entryMs + Math.max(1, loops) * completion.loopPeriodMs;
    const delayMs = Math.max(0, exitStartsAt - elapsed) + completion.exitMs + completion.marginMs;
    later(delayMs, () => {
      completed = true;
      completedAt = now();
      clearTimers();
      options.onComplete();
    });
  };
  return {
    trigger,
    stop,
    mount,
    bind,
    completed: () => completed,
    elapsedMs: () => (startedAt === null ? null : Math.max(0, (completedAt ?? now()) - startedAt)),
  };
}
