const pending = new Map<string, Promise<void>>();

export async function serializeRiveAttachment<T>(projectId: string, operation: () => Promise<T>) {
  const previous = pending.get(projectId) ?? Promise.resolve();
  let release = () => {};
  const lock = new Promise<void>((resolve) => {
    release = resolve;
  });
  pending.set(projectId, lock);
  await previous;
  try {
    return await operation();
  } finally {
    release();
    if (pending.get(projectId) === lock) pending.delete(projectId);
  }
}
