export async function claimRoom(
  roomId: string,
  signal: AbortSignal,
  waitMs = 0,
): Promise<(() => void) | null> {
  if (!navigator.locks || signal.aborted) return null;
  const acquisition = waitMs > 0 ? AbortSignal.any([signal, AbortSignal.timeout(waitMs)]) : signal;
  return new Promise((resolve, reject) => {
    void navigator.locks
      .request(
        `buzzzz-room:${roomId}`,
        waitMs > 0 ? { signal: acquisition } : { ifAvailable: true },
        async (lock) => {
          if (!lock || signal.aborted) return resolve(null);
          let release: () => void = () => {};
          const held = new Promise<void>((done) => {
            release = done;
          });
          const finish = () => {
            signal.removeEventListener("abort", finish);
            release();
          };
          signal.addEventListener("abort", finish, { once: true });
          resolve(finish);
          await held;
        },
      )
      .catch((error: unknown) => {
        if (!signal.aborted && acquisition.aborted) resolve(null);
        else reject(error);
      });
  });
}
