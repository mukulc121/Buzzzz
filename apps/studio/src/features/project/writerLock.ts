import type { TLockState } from "./model";

export interface IWriterLock {
  takeOver: () => Promise<void>;
  release: () => void;
}

// One Web Lock per project: the holder writes, everyone else follows and queues for it.
export function claimWriter(name: string, onChange: (state: TLockState) => void): IWriterLock {
  const locks = typeof navigator === "undefined" ? undefined : navigator.locks;
  if (!locks) {
    onChange("unsupported");
    return { takeOver: async () => {}, release: () => {} };
  }
  let closed = false;
  let waiting = new AbortController();
  let free = () => {};

  const request = (options: LockOptions) => {
    let held = false;
    locks
      .request(name, options, (lock) => {
        if (closed) return;
        if (!lock) {
          onChange("busy");
          queue();
          return;
        }
        held = true;
        onChange("held");
        return new Promise<void>((resolve) => (free = resolve));
      })
      .catch(() => {
        if (closed || !held) return;
        onChange("stolen");
        queue();
      });
  };
  const queue = () => {
    waiting = new AbortController();
    request({ signal: waiting.signal });
  };

  onChange("pending");
  request({ ifAvailable: true });
  return {
    takeOver: async () => {
      waiting.abort();
      request({ steal: true });
    },
    release: () => {
      closed = true;
      waiting.abort();
      free();
    },
  };
}

// Runs `task` only if no window holds the project; null means it is open elsewhere.
export async function whenFree<T extends object>(
  name: string,
  task: () => T | Promise<T>,
): Promise<T | null> {
  const locks = typeof navigator === "undefined" ? undefined : navigator.locks;
  if (!locks) return task();
  return locks.request(name, { ifAvailable: true }, (lock) => (lock ? task() : null));
}

export const lockName = (id: string) => `buzzzz-project:${id}`;
