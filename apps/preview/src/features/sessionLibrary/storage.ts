import AsyncStorage from "@react-native-async-storage/async-storage";
import type { IPatternLibrary } from "./model";
import { decodePatternLibrary } from "./patternStorage";

const KEY = "pulsar:media-library";

export function createPatternLibraryStorage(
  adapter: Pick<typeof AsyncStorage, "getItem" | "setItem"> = AsyncStorage,
) {
  let current: IPatternLibrary | undefined;
  let pending = Promise.resolve();
  const read = async () => {
    if (current === undefined) current = decodePatternLibrary(await adapter.getItem(KEY));
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
    update: (change: (library: IPatternLibrary) => IPatternLibrary) =>
      serialize(async () => {
        const previous = await read();
        const next = change(previous);
        if (next !== previous) {
          await adapter.setItem(KEY, JSON.stringify(next));
          current = next;
        }
        return next;
      }),
  };
}
