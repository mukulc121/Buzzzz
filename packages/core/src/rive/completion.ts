import type { IRiveConfig } from "./config.ts";

interface IRiveCompletion<TTimer> {
  completion: IRiveConfig["completion"];
  now?: () => number;
  schedule: (callback: () => void, delayMs: number) => TTimer;
  cancel: (timer: TTimer) => void;
  fireTrigger?: (name: string) => void;
  onComplete: () => void;
  onStart?: () => void;
  onExitStart?: (delayMs: number) => void;
}

export function createRiveCompletion<TTimer>(options: IRiveCompletion<TTimer>) {
  const { completion, now = Date.now } = options;
  const timers = new Set<TTimer>();
  let startedAt: number | null = null;
  let mountedAt: number | null = null;
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
    mountedAt = null;
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
  const start = () => {
    startedAt = now();
    options.onStart?.();
    scheduleReady();
  };
  const scheduleReady = () => {
    if (
      !completion ||
      startedAt === null ||
      ready ||
      automatic ||
      completion.readyAfterMs === undefined ||
      (!options.fireTrigger && !completion.phases)
    )
      return;
    automatic = {
      timer: later(
        Math.max(0, completion.readyAfterMs - (now() - (mountedAt ?? startedAt))),
        () => {
          automatic = null;
          if (ready || completed) return;
          options.fireTrigger?.(completion.readyTrigger);
          // A clock-owned profile commits readiness itself one tick later, like Dex's isReady effect.
          if (completion.phases) later(0, () => trigger(completion.readyTrigger));
        },
      ),
    };
  };
  const mount = () => {
    if (completion?.clock === "play" && mountedAt === null) mountedAt = now();
    if (completion?.clock !== "mount" || startedAt !== null) return;
    mounted = true;
    startedAt = now();
    options.onStart?.();
    if (bound) scheduleReady();
  };
  const bind = () => {
    if (bound) return;
    bound = true;
    if (completion?.clock === "play" && startedAt === null) start();
    else if (mounted) scheduleReady();
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
    if (name === completion.startTrigger && startedAt === null && completion.clock !== "play")
      start();
    if (startedAt === null || !ready || armed) return;
    armed = true;
    const elapsed = now() - startedAt;
    const loops = Math.ceil((elapsed - completion.entryMs) / completion.loopPeriodMs);
    const exitStartsAt = completion.entryMs + Math.max(1, loops) * completion.loopPeriodMs;
    const exitStartsIn = Math.max(0, exitStartsAt - elapsed);
    options.onExitStart?.(exitStartsIn);
    const delayMs = exitStartsIn + completion.exitMs + completion.marginMs;
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
