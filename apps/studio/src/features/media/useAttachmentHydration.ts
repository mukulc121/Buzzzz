import { useEffect, useRef, type RefObject } from "react";
import type { IMediaAttachment, IMediaTrim, MediaKind } from "./model";

interface ILoaded {
  scope: string;
  assetId: string | null;
}
interface IAttachmentHydration {
  projectId: string;
  trackScope: string;
  scopeOf: (kind: MediaKind) => string;
  libraryReady: boolean;
  attachment: Partial<Record<MediaKind, IMediaAttachment>>;
  revision: number;
  getFile: (id: string) => Promise<File | null>;
  loaded: RefObject<Record<MediaKind, ILoaded>>;
  tokens: RefObject<Record<MediaKind, number>>;
  hydrating: RefObject<Partial<Record<MediaKind, string>>>;
  importing: RefObject<Set<MediaKind>>;
  invalidate: (kind: MediaKind, key?: string) => number;
  clearKind: (kind: MediaKind) => void;
  load: (
    kind: MediaKind,
    file: File,
    trim: IMediaTrim | null,
    current: () => boolean,
  ) => Promise<boolean>;
  commit: (kind: MediaKind, value: ILoaded, file: File | undefined, notify?: boolean) => void;
}
const KINDS: readonly MediaKind[] = ["audio", "animation", "rive"];

export function useAttachmentHydration(props: IAttachmentHydration) {
  const {
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
  } = props;
  const previous = useRef({ projectId, trackScope });
  useEffect(() => {
    const before = previous.current;
    previous.current = { projectId, trackScope };
    for (const kind of KINDS) {
      const scope = scopeOf(kind);
      if ((kind === "rive" ? before.projectId : before.trackScope) === scope) continue;
      invalidate(kind);
      if (kind !== "rive" || loaded.current.rive.assetId) clearKind(kind);
      commit(kind, { scope, assetId: null }, undefined, false);
    }
  }, [projectId, trackScope, scopeOf, invalidate, clearKind, loaded, commit]);

  useEffect(() => {
    if (!libraryReady) return;
    for (const kind of KINDS) {
      if (importing.current.has(kind)) continue;
      const scope = scopeOf(kind);
      const target = attachment[kind] ?? null;
      const assetId = target?.assetId ?? null;
      const key = `${scope}\u0000${assetId}`;
      const currentLoad = loaded.current[kind];
      if (
        (currentLoad.scope === scope && currentLoad.assetId === assetId) ||
        hydrating.current[kind] === key
      )
        continue;
      const wasHydrating = hydrating.current[kind] !== undefined;
      const token = invalidate(kind, target ? key : undefined);
      const current = () => token === tokens.current[kind];
      if (!target) {
        if (loaded.current[kind].assetId || wasHydrating) clearKind(kind);
        commit(kind, { scope, assetId: null }, undefined, false);
        continue;
      }
      const hydrate = async () => {
        const file = await getFile(target.assetId);
        if (!current()) return;
        const ok = file !== null && (await load(kind, file, target.trim, current));
        if (!current()) return;
        if (!ok) clearKind(kind);
        commit(kind, { scope, assetId }, ok ? file : undefined);
      };
      void hydrate();
    }
  }, [
    libraryReady,
    attachment,
    revision,
    scopeOf,
    invalidate,
    clearKind,
    load,
    getFile,
    commit,
    loaded,
    tokens,
    hydrating,
    importing,
  ]);
}
