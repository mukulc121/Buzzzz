import { COUNTDOWN_SECONDS, tickKind } from "./countdown";

type TCountdownState = { kind: "idle" } | { kind: "running"; remaining: number };
interface ICountdownController {
  play: (kind: ReturnType<typeof tickKind>) => void;
  every?: (callback: () => void) => () => void;
}
export function createCountdownController(options: ICountdownController) {
  const every =
    options.every ??
    ((callback: () => void) => {
      const timer = setInterval(callback, 1000);
      return () => clearInterval(timer);
    });
  let state: TCountdownState = { kind: "idle" };
  let active = true;
  let generation = 0;
  let cancel = () => {};
  const listeners = new Set<() => void>();
  const publish = (next: TCountdownState) => {
    state = next;
    for (const listener of listeners) listener();
  };
  const clear = () => {
    generation++;
    cancel();
    cancel = () => {};
  };
  const reset = () => {
    if (!active) return;
    clear();
    publish({ kind: "idle" });
  };
  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    activate: () => {
      active = true;
    },
    start: () => {
      if (!active) return;
      clear();
      const id = generation;
      publish({ kind: "running", remaining: COUNTDOWN_SECONDS });
      cancel = every(() => {
        if (!active || id !== generation || state.kind !== "running") return;
        const remaining = state.remaining - 1;
        options.play(tickKind(remaining));
        if (remaining <= 0) reset();
        else publish({ kind: "running", remaining });
      });
    },
    reset,
    dispose: () => {
      active = false;
      clear();
    },
  };
}
