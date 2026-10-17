import AsyncStorage from "@react-native-async-storage/async-storage";
import type { IMediaLibrary } from "./mediaModel";
import { decodeMediaLibrary } from "./mediaStorage";

export interface IResourceStorage {
  load(): Promise<IMediaLibrary>;
  update(change: (library: IMediaLibrary) => IMediaLibrary): Promise<IMediaLibrary>;
}

let defaultStorage: IResourceStorage | undefined;

export function createResourceStorage(
  adapter?: Pick<typeof AsyncStorage, "getItem" | "setItem">,
): IResourceStorage {
  if (!adapter) return (defaultStorage ??= createResourceStorage(AsyncStorage));
  let current: IMediaLibrary | undefined;
  let pending = Promise.resolve();
  const read = async () => {
    if (current === undefined)
      current = decodeMediaLibrary(await adapter.getItem("pulsar:media-library"));
    return current;
  };
  const serialize = <T>(operation: () => Promise<T>): Promise<T> => {
    const task = pending.then(operation);
    pending = task.then(
      () => undefined,
      () => undefined,
    );
    return task;
  };
  return {
    load: () => serialize(read),
    update: (change) =>
      serialize(async () => {
        const previous = await read();
        const next = change(previous);
        if (next !== previous) {
          await adapter.setItem("pulsar:media-library", JSON.stringify(next));
          current = next;
        }
        return next;
      }),
  };
}
