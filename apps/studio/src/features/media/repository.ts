import { transact, settle } from "./db";
import {
  MediaStorageError,
  type IMediaAttachment,
  type IMediaItem,
  type IMediaTrim,
  type MediaKind,
} from "./model";
import {
  checkMediaLimits,
  isMediaAttachment,
  isMediaItem,
  normalizeName,
  normalizeTrim,
  scopeFor,
} from "./rules";

interface IAddMedia {
  projectId: string;
  file: File;
  kind: MediaKind;
}
interface IAttachTarget {
  projectId: string;
  presetId: string;
  kind: MediaKind;
}

const missing = () => new MediaStorageError("missing", "That media file no longer exists.");
const many = <T>(value: unknown, guard: (item: unknown) => item is T) =>
  Array.isArray(value) ? value.filter(guard) : [];

async function readItem(tx: IDBTransaction, id: string) {
  const value = await settle(tx.objectStore("items").get(id));
  if (!isMediaItem(value)) throw missing();
  return value;
}

async function sha256(file: File) {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function listMedia(projectId: string) {
  return transact(["items"], "readonly", async (tx) =>
    many(
      await settle(tx.objectStore("items").index("projectId").getAll(projectId)),
      isMediaItem,
    ).sort((a, b) => a.addedAt - b.addedAt),
  );
}

export function listAttachments(projectId: string, presetId: string) {
  return transact(["attachments"], "readonly", async (tx) => {
    const index = tx.objectStore("attachments").index("projectScope");
    const [preset, project] = await Promise.all([
      settle(index.getAll([projectId, presetId])),
      settle(index.getAll([projectId, scopeFor("rive", presetId)])),
    ]);
    return [...many(preset, isMediaAttachment), ...many(project, isMediaAttachment)];
  });
}

export async function readMediaFile(id: string): Promise<File> {
  const { item, blob } = await transact(["items", "blobs"], "readonly", async (tx) => {
    const item = await readItem(tx, id);
    const record = await settle(tx.objectStore("blobs").get(id));
    const blob = typeof record === "object" && record && "blob" in record ? record.blob : null;
    if (!(blob instanceof Blob)) throw missing();
    return { item, blob };
  });
  return new File([blob], item.originalName, { type: item.type, lastModified: item.lastModified });
}

export async function addMedia(props: IAddMedia): Promise<IMediaItem> {
  return (await addMediaCopy(props)).item;
}

export async function addMediaCopy(props: IAddMedia) {
  const { projectId, file, kind } = props;
  const early = checkMediaLimits(file.size, []);
  if (early) throw early;
  const hash = await sha256(file);
  return transact(["items", "blobs"], "readwrite", async (tx) => {
    const items = tx.objectStore("items");
    const existing = many(await settle(items.index("projectId").getAll(projectId)), isMediaItem);
    const duplicate = existing.find((item) => item.sha256 === hash && item.kind === kind);
    if (duplicate) return { item: duplicate, created: false };
    const blocked = checkMediaLimits(file.size, existing);
    if (blocked) throw blocked;
    const item: IMediaItem = {
      id: `media_${crypto.randomUUID()}`,
      projectId,
      kind,
      name: normalizeName(file.name || kind),
      originalName: file.name,
      type: file.type,
      size: file.size,
      lastModified: file.lastModified,
      addedAt: Date.now(),
      sha256: hash,
    };
    await Promise.all([
      settle(items.add(item)),
      settle(tx.objectStore("blobs").add({ id: item.id, blob: file })),
    ]);
    return { item, created: true };
  });
}

export async function renameMedia(id: string, name: string) {
  const value = normalizeName(name);
  return transact(["items"], "readwrite", async (tx) => {
    const item = await readItem(tx, id);
    await settle(tx.objectStore("items").put({ ...item, name: value }));
  });
}

// Deleting a file also removes every pattern attachment that points at it.
export function deleteMedia(id: string) {
  return transact(["items", "blobs", "attachments"], "readwrite", async (tx) => {
    const attachments = tx.objectStore("attachments");
    const keys = await settle(attachments.index("assetId").getAllKeys(id));
    await Promise.all([
      settle(tx.objectStore("items").delete(id)),
      settle(tx.objectStore("blobs").delete(id)),
      ...(Array.isArray(keys) ? keys : []).map((key: IDBValidKey) =>
        settle(attachments.delete(key)),
      ),
    ]);
  });
}

export function attachMedia(
  props: Omit<IAttachTarget, "kind"> & { assetId: string; replace?: boolean },
) {
  const { projectId, presetId, assetId } = props;
  return transact(["items", "attachments"], "readwrite", async (tx) => {
    const item = await readItem(tx, assetId);
    if (item.projectId !== projectId) throw missing();
    const attachment: IMediaAttachment = {
      projectId,
      scope: scopeFor(item.kind, presetId),
      kind: item.kind,
      assetId,
      trim: null,
    };
    const store = tx.objectStore("attachments");
    await settle(props.replace === false ? store.add(attachment) : store.put(attachment));
    return attachment;
  });
}

export async function attachRiveMedia(props: {
  projectId: string;
  presetId: string;
  assetId: string;
  current: () => boolean;
}) {
  const { projectId, presetId, assetId, current } = props;
  const revision = crypto.randomUUID();
  const key = [projectId, scopeFor("rive", presetId), "rive"];
  const previous = await transact(["items", "attachments"], "readwrite", async (tx) => {
    const item = await readItem(tx, assetId);
    if (item.projectId !== projectId || item.kind !== "rive") throw missing();
    const store = tx.objectStore("attachments");
    const previous = await settle(store.get(key));
    if (!current()) return undefined;
    await settle(
      store.put({ projectId, scope: key[1], kind: "rive", assetId, trim: null, revision }),
    );
    return isMediaAttachment(previous) ? previous : null;
  });
  if (previous === undefined) return null;
  const rollback = () =>
    transact(["attachments"], "readwrite", async (tx) => {
      const store = tx.objectStore("attachments");
      const attachment = await settle(store.get(key));
      if (
        !isMediaAttachment(attachment) ||
        !("revision" in attachment) ||
        attachment.revision !== revision
      )
        return;
      await settle(previous ? store.put(previous) : store.delete(key));
    });
  return { assetId, rollback };
}

export function rollbackMediaCopy(
  target: { projectId: string; presetId: string },
  files: { id: string; kind: MediaKind; created: boolean; attached: boolean }[],
) {
  return transact(["items", "blobs", "attachments"], "readwrite", async (tx) => {
    const attachments = tx.objectStore("attachments");
    for (const file of files) {
      const key = [target.projectId, scopeFor(file.kind, target.presetId), file.kind];
      const current = await settle(attachments.get(key));
      if (file.attached && isMediaAttachment(current) && current.assetId === file.id)
        await settle(attachments.delete(key));
      const references = await settle(attachments.index("assetId").count(file.id));
      if (file.created && references === 0) {
        await settle(tx.objectStore("items").delete(file.id));
        await settle(tx.objectStore("blobs").delete(file.id));
      }
    }
  });
}

export function detachMedia(props: IAttachTarget) {
  const { projectId, presetId, kind } = props;
  return transact(["attachments"], "readwrite", async (tx) => {
    await settle(tx.objectStore("attachments").delete([projectId, scopeFor(kind, presetId), kind]));
  });
}

export async function setMediaTrim(
  props: IAttachTarget & { trim: IMediaTrim | null; expectedAssetId?: string },
) {
  const { projectId, presetId, kind } = props;
  if (kind === "rive") throw new MediaStorageError("invalid", "Rive files can't be trimmed.");
  const trim = props.trim && normalizeTrim(props.trim);
  return transact(["attachments"], "readwrite", async (tx) => {
    const store = tx.objectStore("attachments");
    const current = await settle(store.get([projectId, scopeFor(kind, presetId), kind]));
    if (
      props.expectedAssetId !== undefined &&
      (!isMediaAttachment(current) || current.assetId !== props.expectedAssetId)
    )
      return false;
    if (!isMediaAttachment(current)) throw missing();
    await settle(store.put({ ...current, trim }));
  });
}
