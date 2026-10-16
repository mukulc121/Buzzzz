import { cloudOrigin, uploadRive, type IRoom } from "../connection/cloud";
interface IEntry {
  users: number;
  promise: Promise<string> | null;
  deleting: boolean;
  room: IRoom | null;
}
const uploads = new WeakMap<ArrayBuffer, Map<string, IEntry>>();
export function leaseRiveUpload(
  buffer: ArrayBuffer,
  room: IRoom | null,
  onError: (message: string) => void,
) {
  let rooms = uploads.get(buffer);
  if (!rooms) {
    rooms = new Map();
    uploads.set(buffer, rooms);
  }
  const roomId = room?.roomId ?? "lan";
  const previous = rooms.get(roomId);
  const entry =
    previous && !previous.deleting ? previous : { users: 0, promise: null, deleting: false, room };
  rooms.set(roomId, entry);
  entry.users++;
  const remove = async (path: string) => {
    if (entry.users || entry.deleting) return;
    entry.deleting = true;
    const origin = cloudOrigin();
    if (entry.room && origin) {
      const response = await fetch(`${origin}${new URL(path).pathname}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${entry.room.hostToken}` },
      });
      if (!response.ok && ![401, 404, 410].includes(response.status))
        throw new Error("Could not release the previous Rive upload");
    }
    if (rooms.get(roomId) === entry) rooms.delete(roomId);
  };
  const clean = () => {
    if (entry.users) return;
    const pending = entry.promise;
    if (pending)
      void pending
        .then(remove)
        .catch((error) =>
          onError(error instanceof Error ? error.message : "Upload cleanup failed"),
        );
    else if (rooms.get(roomId) === entry) rooms.delete(roomId);
  };
  let released = false;
  return {
    load: () => {
      if (!entry.promise) {
        entry.promise = uploadRive(buffer, room);
        void entry.promise.catch(() => {
          entry.promise = null;
        });
      }
      return entry.promise;
    },
    release: () => {
      if (released) return;
      released = true;
      entry.users--;
      queueMicrotask(clean);
    },
  };
}
