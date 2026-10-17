import { createRiveHaptics, type IRiveConfig, type TSystemImpact } from "../../src/index.ts";

interface IRiveClock {
  completion?: IRiveConfig["completion"];
  ignoreCancellation?: boolean;
}

interface ITimer {
  at: number;
  callback: () => void;
}

export function riveClock(options: IRiveClock = {}) {
  let now = 0;
  let nextId = 0;
  let enabled = true;
  const timers = new Map<number, ITimer>();
  const impacts: { at: number; preset: TSystemImpact }[] = [];
  const fired: { at: number; name: string }[] = [];
  const completions: number[] = [];
  const playback = createRiveHaptics({
    completion: options.completion,
    now: () => now,
    play: (preset) => impacts.push({ at: now, preset }),
    canPlay: () => enabled,
    fireTrigger: (name) => fired.push({ at: now, name }),
    onComplete: () => completions.push(now),
    schedule: (callback, delayMs) => {
      const id = ++nextId;
      timers.set(id, { at: now + delayMs, callback });
      return id;
    },
    cancel: (id) => {
      if (!options.ignoreCancellation) timers.delete(id);
    },
  });
  const advance = (ms: number) => {
    const end = now + ms;
    while (true) {
      const next = [...timers.entries()]
        .filter(([, timer]) => timer.at <= end)
        .sort(([aId, a], [bId, b]) => a.at - b.at || aId - bId)[0];
      if (!next) break;
      const [id, timer] = next;
      timers.delete(id);
      now = timer.at;
      timer.callback();
    }
    now = end;
  };
  return {
    ...playback,
    impacts,
    fired,
    completions,
    advance,
    pending: () => timers.size,
    setEnabled: (value: boolean) => {
      enabled = value;
    },
  };
}
