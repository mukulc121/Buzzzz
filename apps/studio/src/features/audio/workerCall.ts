type WorkerReply<TResult> =
  | ({ requestId: number; ok: true } & TResult)
  | { requestId: number; ok: false; error: string };

// One request on a shared worker, matched by requestId as Pulsar's workers reply.
export function callWorker<TResult>(
  worker: Worker,
  request: { requestId: number; channels: Float32Array[] },
  crashMessage: string,
) {
  return new Promise<TResult>((resolve, reject) => {
    const onMessage = (event: MessageEvent<WorkerReply<TResult>>) => {
      if (event.data.requestId !== request.requestId) return;
      cleanup();
      if (event.data.ok) resolve(event.data);
      else reject(new Error(event.data.error));
    };
    const onError = (event: ErrorEvent) => {
      cleanup();
      reject(new Error(event.message || crashMessage));
    };
    const cleanup = () => {
      worker.removeEventListener("message", onMessage);
      worker.removeEventListener("error", onError);
    };
    worker.addEventListener("message", onMessage);
    worker.addEventListener("error", onError);
    worker.postMessage(
      request,
      request.channels.map((channel) => channel.buffer as ArrayBuffer),
    );
  });
}
