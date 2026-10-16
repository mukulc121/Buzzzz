import AsyncStorage from "@react-native-async-storage/async-storage";
import { decodeConnections, storedConnection, type IStoredConnection } from "./model";
import type { IPhoneConnection } from "./pairing";

const KEY = "pulsar:connections";

export function createConnectionStorage(
  adapter: Pick<typeof AsyncStorage, "getItem" | "setItem"> = AsyncStorage,
) {
  let current: IStoredConnection[] | undefined;
  let pending = Promise.resolve();
  const read = async () => {
    if (current === undefined) current = decodeConnections(await adapter.getItem(KEY));
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
    add: (connection: IPhoneConnection) =>
      serialize(async () => {
        const previous = await read();
        const record = storedConnection(previous, connection);
        const next = [...previous.filter((item) => item.id !== record.id), record];
        await adapter.setItem(KEY, JSON.stringify(next));
        current = next;
        return record;
      }),
    remove: (id: string) =>
      serialize(async () => {
        const previous = await read();
        const next = previous.filter((item) => item.id !== id);
        if (next.length !== previous.length) {
          await adapter.setItem(KEY, JSON.stringify(next));
          current = next;
        }
      }),
  };
}
