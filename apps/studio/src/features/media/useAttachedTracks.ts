import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { MediaKind } from "./model";
import { useAttachmentLoader, type IAttachmentCodecs } from "./useAttachmentLoader";
import { useAttachmentHydration } from "./useAttachmentHydration";
import { usePersistedAudioTrim } from "./usePersistedAudioTrim";
import { checkMediaLimits, toMediaError } from "./rules";
import { useMediaLibrary } from "./useMediaLibrary";
import { readRiveFile } from "./attachments";
import { attachRiveMedia, listAttachments } from "./repository";
import { serializeRiveAttachment } from "./riveTransfer";

type Pending = "import" | "hydrate";
interface ILoaded {
  scope: string;
  assetId: string | null;
}
interface IAttachmentCommit {
  assetId: string;
  rollback?: () => Promise<void>;
}
interface IAttachedTracks extends IAttachmentCodecs {
  projectId: string;
  presetId: string;
  writable: boolean;
  onRiveAttach: (preserveConfig: boolean) => boolean;
  onRiveDetach: () => void;
  rivePresetId: string | null;
}

const KINDS: readonly MediaKind[] = ["audio", "animation", "rive"];
const isLoaded = (loaded: ILoaded, scope: string, assetId: string | null) =>
  loaded.scope === scope && loaded.assetId === assetId;

export function useAttachedTracks(props: IAttachedTracks) {
  const {
    projectId,
    presetId,
    writable,
    onError,
    audio,
    animation,
    rive,
    onRiveAttach,
    onRiveDetach,
  } = props;
  const library = useMediaLibrary({ projectId, presetId, writable, onError });
  const { ready: libraryReady, attachment, getFile, updateTrim } = library;
  const { load, clearKind } = useAttachmentLoader({ audio, animation, rive, onError });
  const { setRiv } = rive;
  const { refresh } = library;
  const trackScope = `${projectId}\u0000${presetId}`;
  const access = useRef({ projectId, trackScope, writable, version: 0 });
  useLayoutEffect(() => {
    const before = access.current;
    access.current = {
      trackScope,
      projectId,
      writable,
      version:
        before.version + Number(before.trackScope !== trackScope || before.writable !== writable),
    };
  }, [projectId, trackScope, writable]);
  const scopeOf = useCallback(
    (kind: MediaKind) => (kind === "rive" ? projectId : trackScope),
    [projectId, trackScope],
  );

  const [importingToken, setImportingToken] = useState<Partial<Record<MediaKind, number>>>({});
  const [revision, setRevision] = useState(0);
  const initial: Record<MediaKind, ILoaded> = {
    audio: { scope: trackScope, assetId: null },
    animation: { scope: trackScope, assetId: null },
    rive: { scope: projectId, assetId: null },
  };
  // The ref drives async decisions; the state mirrors finished loads for render.
  const loaded = useRef(initial);
  const [hydrated, setHydrated] = useState(initial);
  const loadedFile = useRef<Partial<Record<MediaKind, File>>>({});
  const tokens = useRef<Record<MediaKind, number>>({ audio: 0, animation: 0, rive: 0 });
  const hydrating = useRef<Partial<Record<MediaKind, string>>>({});
  const importing = useRef(new Set<MediaKind>());
  const attachmentRef = useRef(attachment);
  const errorHandler = useRef(onError);
  useEffect(() => {
    errorHandler.current = onError;
    attachmentRef.current = attachment;
  }, [onError, attachment]);

  // Each import owns its busy entry, so a superseded one can't clear a newer one.
  const unmark = useCallback((kind: MediaKind, token: number) => {
    setImportingToken((current) => {
      if (current[kind] !== token) return current;
      const next = { ...current };
      delete next[kind];
      return next;
    });
  }, []);
  const commit = useCallback(
    (kind: MediaKind, value: ILoaded, file: File | undefined, notify = true) => {
      hydrating.current[kind] = undefined;
      loaded.current[kind] = value;
      loadedFile.current[kind] = file;
      if (notify) setHydrated((current) => ({ ...current, [kind]: value }));
    },
    [],
  );
  // Bumping the token invalidates every async step started for this kind.
  const invalidate = useCallback((kind: MediaKind, key?: string) => {
    hydrating.current[kind] = key;
    importing.current.delete(kind);
    return ++tokens.current[kind];
  }, []);
  useAttachmentHydration({
    projectId,
    trackScope,
    scopeOf,
    libraryReady,
    attachment,
    revision,
    getFile,
    loaded,
    tokens,
    hydrating,
    importing,
    invalidate,
    clearKind,
    load,
    commit,
  });

  // Validate (decode) first, then store/attach. Bad files never replace the live track.
  const apply = useCallback(
    async (
      kind: MediaKind,
      file: File,
      persist: (current: () => boolean) => Promise<IAttachmentCommit | null>,
      preserveRiveConfig = false,
    ) => {
      const scope = scopeOf(kind);
      const version = access.current.version;
      const canWrite = () =>
        access.current.writable &&
        access.current.trackScope === trackScope &&
        access.current.version === version;
      if (!canWrite()) {
        errorHandler.current("Open this project for editing to change media");
        return false;
      }
      const token = invalidate(kind);
      const current = () => token === tokens.current[kind] && canWrite();
      importing.current.add(kind);
      setImportingToken((current) => ({ ...current, [kind]: token }));
      const run = async () => {
        try {
          if (!current()) return false;
          const buffer = kind === "rive" ? await readRiveFile(file) : null;
          if (kind !== "rive" && !(await load(kind, file, null, current))) return false;
          if (!current()) return false;
          const stored = await persist(current);
          if (!current()) {
            await stored?.rollback?.();
            if (kind === "rive") await refresh();
            return false;
          }
          if (kind === "rive") {
            if (!stored || !buffer) return false;
            if (!onRiveAttach(preserveRiveConfig)) {
              await stored.rollback?.();
              await refresh();
              return false;
            }
            setRiv({ name: file.name, buffer });
          }
          if (stored) commit(kind, { scope, assetId: stored.assetId }, file);
          // Storage failed: keep the decoded track live but unsaved, and never write its trim.
          else
            commit(
              kind,
              { scope, assetId: attachmentRef.current[kind]?.assetId ?? null },
              undefined,
            );
          if (kind === "rive") await refresh();
          return stored !== null;
        } catch (error) {
          if (current()) errorHandler.current(toMediaError(error).message);
          return false;
        } finally {
          unmark(kind, token);
          if (token === tokens.current[kind]) {
            importing.current.delete(kind);
            setRevision((value) => value + 1);
          }
        }
      };
      return kind === "rive" ? serializeRiveAttachment(projectId, run) : run();
    },
    [
      scopeOf,
      trackScope,
      projectId,
      invalidate,
      load,
      commit,
      unmark,
      onRiveAttach,
      setRiv,
      refresh,
    ],
  );

  const { add, attach } = library;
  const importFile = useCallback(
    (file: File, kind: MediaKind) => {
      const blocked = checkMediaLimits(file.size, []);
      if (blocked) {
        errorHandler.current(blocked.message);
        return Promise.resolve(false);
      }
      return apply(kind, file, async (current) => {
        const item = await add(file, kind);
        if (!item || !current()) return null;
        if (kind === "rive")
          return attachRiveMedia({ projectId, presetId, assetId: item.id, current });
        const attachment = await attach(item.id);
        return attachment ? { assetId: attachment.assetId } : null;
      });
    },
    [apply, add, attach, projectId, presetId],
  );
  const attachAsset = useCallback(
    async (id: string) => {
      const version = access.current.version;
      const item = library.items.find((entry) => entry.id === id);
      const file = item && (await getFile(id));
      if (
        !item ||
        !file ||
        access.current.version !== version ||
        access.current.trackScope !== trackScope
      )
        return false;
      return apply(
        item.kind,
        file,
        async (current) => {
          if (item.kind === "rive")
            return attachRiveMedia({ projectId, presetId, assetId: id, current });
          const attachment = await attach(id);
          return attachment ? { assetId: attachment.assetId } : null;
        },
        id === attachment.rive?.assetId,
      );
    },
    [
      library.items,
      attachment.rive?.assetId,
      getFile,
      apply,
      attach,
      projectId,
      presetId,
      trackScope,
    ],
  );
  const forgetRive = useCallback(async () => {
    const attached = (await listAttachments(projectId, presetId)).some(
      (item) => item.kind === "rive",
    );
    if (!attached && access.current.projectId === projectId && access.current.writable)
      onRiveDetach();
  }, [projectId, presetId, onRiveDetach]);
  const remove = useCallback(
    async (id: string) => {
      const attached = attachment.rive?.assetId === id;
      const result = await library.remove(id);
      if (attached && result !== null) await forgetRive();
      return result;
    },
    [attachment.rive?.assetId, library, forgetRive],
  );
  const detach = useCallback(
    async (kind: MediaKind) => {
      const result = await library.detach(kind);
      if (kind === "rive" && result !== null) await forgetRive();
      return result;
    },
    [library, forgetRive],
  );

  const pending = useMemo(() => {
    const states: Partial<Record<MediaKind, Pending>> = {};
    for (const kind of KINDS) {
      const assetId = attachment[kind]?.assetId;
      if (importingToken[kind] !== undefined) states[kind] = "import";
      else if (libraryReady && assetId && !isLoaded(hydrated[kind], scopeOf(kind), assetId))
        states[kind] = "hydrate";
    }
    return states;
  }, [importingToken, attachment, libraryReady, hydrated, scopeOf]);

  usePersistedAudioTrim({
    libraryReady,
    audioTarget: attachment.audio,
    audio,
    pending: pending.audio,
    trackScope,
    loaded,
    loadedFile,
    tokens,
    updateTrim,
  });

  const ready = libraryReady && !Object.values(pending).includes("hydrate");
  return {
    library: { ...library, remove, detach },
    ready,
    pending,
    importFile,
    attachAsset,
    detach,
    riveAttached: props.rivePresetId === presetId,
  };
}
export type AttachedTracks = ReturnType<typeof useAttachedTracks>;
