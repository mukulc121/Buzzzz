import type {
  ICachedResource,
  IMediaFiles,
  IMediaLibrary,
  IReceivedMedia,
  IResolvedResource,
} from "./mediaModel";
import type { ICachedPattern } from "./model";
import {
  listMediaResources,
  upsertMediaResource,
  renameMediaResources,
  removeMediaResource,
  purgeMediaConnection,
} from "./mediaStorage";
import { receivedMediaRecord } from "./receivedMedia";
import { createResourceStorage, type IResourceStorage } from "./resourceStorage";
import { createReceiptOrder } from "./receiptOrder";
import { createMediaTransfers } from "./mediaTransfers";

interface IMediaCache {
  files: IMediaFiles;
  storage?: IResourceStorage;
  now?: () => number;
}

export function createReceivedMediaCache(options: IMediaCache) {
  const { files, storage = createResourceStorage(), now = Date.now } = options;
  const receipts = createReceiptOrder();
  const transfers = createMediaTransfers(files);
  let pending = Promise.resolve();
  const serialize = <T>(operation: () => Promise<T>): Promise<T> => {
    const task = pending.then(operation);
    pending = task.then(
      () => undefined,
      () => undefined,
    );
    return task;
  };
  const resolve = async (record: ICachedResource): Promise<IResolvedResource> => {
    if (record.kind === "pattern") return { record, clipMissing: false };
    return {
      record,
      localUri: files.uri(record.clipPath),
      clipMissing: !(await files.exists(record.clipPath)),
    };
  };
  const removeUnusedClip = async (record: ICachedResource | undefined, library: IMediaLibrary) => {
    if (!record || record.kind === "pattern") return;
    if (transfers.inUse(record.clipPath)) return;
    const used = Object.values(library).some((records) =>
      records.some((entry) => entry.kind !== "pattern" && entry.clipPath === record.clipPath),
    );
    if (!used) await files.remove(record.clipPath);
  };
  return {
    savePattern: (connectionId: string, record: ICachedPattern) => {
      receipts.remove(connectionId, record.resourceId);
      transfers.cancel(connectionId, record.resourceId);
      return serialize(async () => {
        let previous: ICachedResource | undefined;
        const library = await storage.update((current) => {
          previous = listMediaResources(current, connectionId).find(
            (entry) => entry.resourceId === record.resourceId,
          );
          return upsertMediaResource(current, connectionId, record);
        });
        await removeUnusedClip(previous, library);
        return library;
      });
    },
    list: async (connectionId: string) =>
      Promise.all(listMediaResources(await storage.load(), connectionId).map(resolve)),
    get: async (connectionId: string, resourceId: string) => {
      const record = listMediaResources(await storage.load(), connectionId).find(
        (entry) => entry.resourceId === resourceId,
      );
      return record ? resolve(record) : undefined;
    },
    receive: (
      connectionId: string,
      packet: IReceivedMedia,
      onProgress?: (progress: number) => void,
    ) => {
      const incoming = receivedMediaRecord(connectionId, packet, 0);
      const clip = packet.type === "audio-haptics" ? packet.audio : packet.animation;
      const receipt = receipts.begin(connectionId, packet.resourceId)();
      if (!receipt) return Promise.resolve(undefined);
      transfers.cancel(connectionId, packet.resourceId);
      const transfer = transfers.acquire(incoming.clipPath, clip.downloadUrl, {
        connectionId,
        resourceId: packet.resourceId,
        current: receipt.current,
        progress: onProgress,
      });
      const save = async () => {
        try {
          await transfer.promise;
          return await serialize(async () => {
            if (!receipt.current()) {
              await removeUnusedClip(incoming, await storage.load());
              return undefined;
            }
            const record = { ...incoming, receivedAt: now() };
            let previous: ICachedResource | undefined;
            const library = await storage.update((current) => {
              previous = listMediaResources(current, connectionId).find(
                (entry) => entry.resourceId === record.resourceId,
              );
              return upsertMediaResource(current, connectionId, record);
            });
            await removeUnusedClip(previous, library);
            return { record, localUri: files.uri(record.clipPath), clipMissing: false };
          });
        } catch (error) {
          if (receipt.current()) throw error;
          await serialize(async () => removeUnusedClip(incoming, await storage.load()));
          return undefined;
        } finally {
          transfer.release();
        }
      };
      return save();
    },
    manifest: (connectionId: string, presets: readonly { resourceId: string; name: string }[]) =>
      serialize(() =>
        storage.update((library) => renameMediaResources(library, connectionId, presets)),
      ),
    remove: (connectionId: string, resourceId: string) => {
      receipts.remove(connectionId, resourceId);
      transfers.cancel(connectionId, resourceId);
      return serialize(async () => {
        let previous: ICachedResource | undefined;
        const library = await storage.update((current) => {
          const records = listMediaResources(current, connectionId);
          previous = records.find((record) => record.resourceId === resourceId);
          return removeMediaResource(current, connectionId, resourceId);
        });
        await removeUnusedClip(previous, library);
      });
    },
    purge: (connectionId: string) => {
      receipts.purge(connectionId);
      transfers.cancel(connectionId);
      return serialize(async () => {
        await storage.update((library) => purgeMediaConnection(library, connectionId));
        await files.purge(connectionId);
      });
    },
  };
}
