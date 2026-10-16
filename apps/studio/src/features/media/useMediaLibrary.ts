import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { IMediaAttachment, IMediaItem, IMediaTrim, MediaKind } from "./model";
import {
  addMedia,
  attachMedia,
  deleteMedia,
  detachMedia,
  listAttachments,
  listMedia,
  readMediaFile,
  renameMedia,
  setMediaTrim,
} from "./repository";
import { downloadName, toMediaError } from "./rules";

interface IMediaLibrary {
  projectId: string;
  presetId: string;
  writable: boolean;
  onError: (message: string) => void;
}
interface ISnapshot {
  key: string;
  items: IMediaItem[];
  attachments: IMediaAttachment[];
}

async function loadSnapshot(projectId: string, presetId: string, key: string): Promise<ISnapshot> {
  const [items, attachments] = await Promise.all([
    listMedia(projectId),
    listAttachments(projectId, presetId),
  ]);
  return { key, items, attachments };
}

export function useMediaLibrary(props: IMediaLibrary) {
  const { projectId, presetId, writable, onError } = props;
  const key = `${projectId}\u0000${presetId}`;
  const access = useRef({ key, writable });
  useLayoutEffect(() => {
    access.current = { key, writable };
  }, [key, writable]);
  const [snapshot, setSnapshot] = useState<ISnapshot | null>(null);
  const generation = useRef(0);
  const errorHandler = useRef(onError);
  useEffect(() => {
    errorHandler.current = onError;
  }, [onError]);

  const refresh = useCallback(async () => {
    const request = ++generation.current;
    try {
      const next = await loadSnapshot(projectId, presetId, key);
      if (request === generation.current) setSnapshot(next);
    } catch (error) {
      if (request === generation.current) errorHandler.current(toMediaError(error).message);
    }
  }, [projectId, presetId, key]);
  const refreshRef = useRef(refresh);
  useEffect(() => {
    refreshRef.current = refresh;
    let active = true;
    const request = ++generation.current;
    loadSnapshot(projectId, presetId, key).then(
      (next) => {
        if (active && request === generation.current) setSnapshot(next);
      },
      (error: unknown) => {
        if (active && request === generation.current)
          errorHandler.current(toMediaError(error).message);
      },
    );
    return () => {
      active = false;
    };
  }, [refresh, projectId, presetId, key]);

  const run = useCallback(
    async <T>(operation: () => Promise<T>): Promise<T | null> => {
      if (!access.current.writable || access.current.key !== key) {
        errorHandler.current("Open this project for editing to change media");
        return null;
      }
      try {
        const result = await operation();
        await refreshRef.current();
        return result;
      } catch (error) {
        errorHandler.current(toMediaError(error).message);
        await refreshRef.current();
        return null;
      }
    },
    [key],
  );

  const ready = snapshot?.key === key;
  const items = useMemo(() => (ready ? snapshot.items : []), [ready, snapshot]);
  const attachment = useMemo(() => {
    const byKind: Partial<Record<MediaKind, IMediaAttachment>> = {};
    if (ready) for (const item of snapshot.attachments) byKind[item.kind] = item;
    return byKind;
  }, [ready, snapshot]);

  const add = useCallback(
    (file: File, kind: MediaKind) => run(() => addMedia({ projectId, file, kind })),
    [run, projectId],
  );
  const rename = useCallback((id: string, name: string) => run(() => renameMedia(id, name)), [run]);
  const remove = useCallback((id: string) => run(() => deleteMedia(id)), [run]);
  const attach = useCallback(
    (assetId: string) => run(() => attachMedia({ projectId, presetId, assetId })),
    [run, projectId, presetId],
  );
  const detach = useCallback(
    (kind: MediaKind) => run(() => detachMedia({ projectId, presetId, kind })),
    [run, projectId, presetId],
  );
  const updateTrim = useCallback(
    (kind: MediaKind, trim: IMediaTrim | null, expectedAssetId?: string) =>
      run(() => setMediaTrim({ projectId, presetId, kind, trim, expectedAssetId })),
    [run, projectId, presetId],
  );
  const getFile = useCallback(async (id: string) => {
    try {
      return await readMediaFile(id);
    } catch (error) {
      errorHandler.current(toMediaError(error).message);
      return null;
    }
  }, []);
  const download = useCallback(
    async (id: string) => {
      const item = items.find((entry) => entry.id === id);
      const file = item && (await getFile(id));
      if (!item || !file) return;
      const url = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = url;
      link.download = downloadName(item);
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    },
    [items, getFile],
  );

  return {
    ready,
    refresh: useCallback(() => refreshRef.current(), []),
    items,
    attachment,
    add,
    rename,
    remove,
    attach,
    detach,
    updateTrim,
    getFile,
    download,
  };
}
