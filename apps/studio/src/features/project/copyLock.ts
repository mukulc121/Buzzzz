const pending = new Map<string, Promise<unknown>>();

export async function serializeProjectCopy<T>(id: string, task: () => Promise<T>): Promise<T> {
  const previous = pending.get(id) ?? Promise.resolve();
  const next = previous
    .catch(() => undefined)
    .then(async () => {
      const locks = typeof navigator === "undefined" ? undefined : navigator.locks;
      return locks ? locks.request(`buzzzz-copy:${id}`, task) : task();
    });
  pending.set(id, next);
  try {
    return await next;
  } finally {
    if (pending.get(id) === next) pending.delete(id);
  }
}
