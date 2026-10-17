import { randomUUID } from "../../crypto";
import { settle, transact } from "./db";
import { MediaStorageError } from "./model";
import { isMediaAttachment, isMediaItem } from "./rules";

export async function cloneProjectMedia(
  sourceId: string,
  targetId: string,
): Promise<() => Promise<void>> {
  if (sourceId === targetId) throw new Error("A project copy needs a new ID");
  const cloned = await transact(["items", "blobs", "attachments"], "readwrite", async (tx) => {
    const items = tx.objectStore("items");
    const blobs = tx.objectStore("blobs");
    const attachments = tx.objectStore("attachments");
    const source: unknown = await settle(items.index("projectId").getAll(sourceId));
    const existing: unknown = await settle(items.index("projectId").getAll(targetId));
    if (!Array.isArray(source) || !source.every(isMediaItem))
      throw new MediaStorageError("invalid", "The source project media is invalid.");
    if (!Array.isArray(existing) || existing.length)
      throw new MediaStorageError("invalid", "The target project already has media.");
    const ids: string[] = [];
    const keys: IDBValidKey[] = [];
    for (const item of source) {
      const stored = await settle(blobs.get(item.id));
      if (
        typeof stored !== "object" ||
        !stored ||
        !("blob" in stored) ||
        !(stored.blob instanceof Blob)
      )
        throw new MediaStorageError("missing", "A source project media file is missing.");
      const linked: unknown = await settle(attachments.index("assetId").getAll(item.id));
      if (!Array.isArray(linked) || !linked.every(isMediaAttachment))
        throw new MediaStorageError("invalid", "The source project attachments are invalid.");
      const id = `media_${randomUUID()}`;
      ids.push(id);
      await Promise.all([
        settle(items.add({ ...item, id, projectId: targetId })),
        settle(blobs.add({ id, blob: stored.blob })),
        ...linked
          .filter((attachment) => attachment.projectId === sourceId)
          .map((attachment) => {
            const copy = { ...attachment, projectId: targetId, assetId: id };
            keys.push([targetId, copy.scope, copy.kind]);
            return settle(attachments.add(copy));
          }),
      ]);
    }
    return { ids, keys };
  });
  return () =>
    transact(["items", "blobs", "attachments"], "readwrite", async (tx) => {
      await Promise.all([
        ...cloned.ids.flatMap((id) => [
          settle(tx.objectStore("items").delete(id)),
          settle(tx.objectStore("blobs").delete(id)),
        ]),
        ...cloned.keys.map((key) => settle(tx.objectStore("attachments").delete(key))),
      ]);
    });
}
