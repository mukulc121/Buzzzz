interface IRiveTimers<TTimer> {
  now?: () => number;
  schedule: (callback: () => void, delayMs: number) => TTimer;
  cancel: (timer: TTimer) => void;
}

interface IPendingTimer<TTimer> {
  at: number;
  callback: () => void;
  handle: { timer: TTimer } | null;
  generation: number;
  active: boolean;
}

export function createRiveTimers<TTimer>(options: IRiveTimers<TTimer>) {
  const wallTime = options.now ?? Date.now;
  const pending = new Set<IPendingTimer<TTimer>>();
  let pausedAt: number | null = null;
  let pausedMs = 0;
  const now = () => (pausedAt ?? wallTime()) - pausedMs;
  const disarm = (entry: IPendingTimer<TTimer>) => {
    entry.generation++;
    if (entry.handle) options.cancel(entry.handle.timer);
    entry.handle = null;
  };
  const arm = (entry: IPendingTimer<TTimer>) => {
    const generation = ++entry.generation;
    entry.handle = {
      timer: options.schedule(
        () => {
          if (!entry.active || entry.generation !== generation || pausedAt !== null) return;
          entry.active = false;
          entry.handle = null;
          pending.delete(entry);
          entry.callback();
        },
        Math.max(0, entry.at - now()),
      ),
    };
  };
  const schedule = (callback: () => void, delayMs: number) => {
    const entry: IPendingTimer<TTimer> = {
      at: now() + delayMs,
      callback,
      handle: null,
      generation: 0,
      active: true,
    };
    pending.add(entry);
    if (pausedAt === null) arm(entry);
    return () => {
      entry.active = false;
      disarm(entry);
      pending.delete(entry);
    };
  };
  const pause = () => {
    if (pausedAt !== null) return;
    pausedAt = wallTime();
    for (const entry of pending) disarm(entry);
  };
  const resume = () => {
    if (pausedAt === null) return;
    pausedMs += wallTime() - pausedAt;
    pausedAt = null;
    for (const entry of pending) arm(entry);
  };
  const stop = () => {
    for (const entry of pending) {
      entry.active = false;
      disarm(entry);
    }
    pending.clear();
    pausedAt = null;
    pausedMs = 0;
  };
  return { now, schedule, pause, resume, stop, paused: () => pausedAt !== null };
}
