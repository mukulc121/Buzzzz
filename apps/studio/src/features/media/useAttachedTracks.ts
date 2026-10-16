import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { MediaKind } from "./model";
import { useAttachmentLoader, type IAttachmentCodecs } from "./useAttachmentLoader";
import { useAttachmentHydration } from "./useAttachmentHydration";
import { usePersistedAudioTrim } from "./usePersistedAudioTrim";
import { checkMediaLimits } from "./rules";
import { useMediaLibrary } from "./useMediaLibrary";

type Pending = "import" | "hydrate";
interface ILoaded {
  scope: string;
  assetId: string | null;
}
interface IAttachedTracks extends IAttachmentCodecs {
  projectId: string;
  presetId: string;
  writable: boolean;
}

const KINDS: readonly MediaKind[] = ["audio", "animation", "rive"];
const isLoaded = (loaded: ILoaded, scope: string, assetId: string | null) =>
  loaded.scope === scope && loaded.assetId === assetId;

export function useAttachedTracks(props: IAttachedTracks) {
  const { projectId, presetId, writable, onError, audio, animation, rive } = props;
  const library = useMediaLibrary({ projectId, presetId, writable, onError });
  const { ready: libraryReady, attachment, getFile, updateTrim } = library;
  const { load, clearKind } = useAttachmentLoader({ audio, animation, rive, onError });
  const trackScope = `${projectId}\u0000${presetId}`;
  const access = useRef({ projectId, trackScope, writable });
  useLayoutEffect(() => {
    access.current = { projectId, trackScope, writable };
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
    async (kind: MediaKind, file: File, persist: () => Promise<string | null>) => {
      const scope = scopeOf(kind);
      const canWrite = () =>
        access.current.writable &&
        (kind === "rive" ? access.current.projectId : access.current.trackScope) === scope;
      if (!canWrite()) {
        errorHandler.current("Open this project for editing to change media");
        return false;
      }
      const token = invalidate(kind);
      const current = () => token === tokens.current[kind] && canWrite();
      importing.current.add(kind);
      setImportingToken((current) => ({ ...current, [kind]: token }));
      try {
        if (!(await load(kind, file, null, current)) || !current()) return false;
        const assetId = await persist();
        if (!current()) return false;
        if (assetId) commit(kind, { scope, assetId }, file);
        // Storage failed: keep the decoded track live but unsaved, and never write its trim.
        else
          commit(kind, { scope, assetId: attachmentRef.current[kind]?.assetId ?? null }, undefined);
        return assetId !== null;
      } finally {
        unmark(kind, token);
        if (token === tokens.current[kind]) {
          importing.current.delete(kind);
          setRevision((value) => value + 1);
        }
      }
    },
    [scopeOf, invalidate, load, commit, unmark],
  );

  const { add, attach } = library;
  const importFile = useCallback(
    (file: File, kind: MediaKind) => {
      const blocked = checkMediaLimits(file.size, []);
      if (blocked) {
        errorHandler.current(blocked.message);
        return Promise.resolve(false);
      }
      return apply(kind, file, async () => {
        const item = await add(file, kind);
        return item && ((await attach(item.id))?.assetId ?? null);
      });
    },
    [apply, add, attach],
  );
  const attachAsset = useCallback(
    async (id: string) => {
      const item = library.items.find((entry) => entry.id === id);
      const file = item && (await getFile(id));
      if (!item || !file) return false;
      return apply(item.kind, file, async () => (await attach(id))?.assetId ?? null);
    },
    [library.items, getFile, apply, attach],
  );
  const { detach } = library;

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
  return { library, ready, pending, importFile, attachAsset, detach };
}
export type AttachedTracks = ReturnType<typeof useAttachedTracks>;
