import type { IMediaFiles } from "./mediaModel";

interface ITransferOwner {
  connectionId: string;
  resourceId: string;
  current: () => boolean;
  progress?: (value: number) => void;
}

interface ITransfer {
  path: string;
  owners: Set<ITransferOwner>;
  controller: AbortController;
  promise: Promise<void>;
  settled: boolean;
  failed: boolean;
}

async function download(
  files: IMediaFiles,
  url: string,
  path: string,
  owners: Set<ITransferOwner>,
  signal: AbortSignal,
  previous?: ITransfer,
) {
  if (previous && !previous.settled) {
    try {
      await previous.promise;
    } catch (error) {
      if (!previous.controller.signal.aborted) throw error;
    }
  }
  if (signal.aborted) return;
  const progress = (value: number) => {
    for (const owner of owners) if (owner.current()) owner.progress?.(value);
  };
  if (!(await files.exists(path))) {
    if (!signal.aborted) await files.download(url, path, progress, signal);
  } else progress(1);
}

export function createMediaTransfers(files: IMediaFiles) {
  const paths = new Map<string, ITransfer>();
  const transfers = new Set<ITransfer>();
  const release = (transfer: ITransfer) => {
    if (!transfer.settled || transfer.owners.size) return;
    transfers.delete(transfer);
    if (paths.get(transfer.path) === transfer) paths.delete(transfer.path);
  };
  return {
    acquire: (path: string, url: string, owner: ITransferOwner) => {
      let transfer = paths.get(path);
      if (!transfer || transfer.controller.signal.aborted || transfer.failed) {
        const owners = new Set<ITransferOwner>();
        const controller = new AbortController();
        const promise = download(files, url, path, owners, controller.signal, transfer);
        transfer = { path, owners, controller, promise, settled: false, failed: false };
        paths.set(path, transfer);
        transfers.add(transfer);
        const task = transfer;
        void promise.then(
          () => {
            task.settled = true;
            release(task);
          },
          () => {
            task.settled = true;
            task.failed = true;
            release(task);
          },
        );
      }
      transfer.owners.add(owner);
      const task = transfer;
      return {
        promise: task.promise,
        release: () => {
          task.owners.delete(owner);
          release(task);
        },
      };
    },
    inUse: (path: string) =>
      [...transfers].some(
        (task) => task.path === path && [...task.owners].some((owner) => owner.current()),
      ),
    cancel: (connectionId: string, resourceId?: string) => {
      for (const task of transfers) {
        for (const owner of task.owners)
          if (
            owner.connectionId === connectionId &&
            (resourceId === undefined || owner.resourceId === resourceId)
          )
            task.owners.delete(owner);
        if (!task.owners.size && !task.settled) task.controller.abort();
        release(task);
      }
    },
  };
}
