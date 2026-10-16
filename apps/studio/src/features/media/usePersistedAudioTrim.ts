import { useEffect, useRef, type RefObject } from "react";
import type { useAudioTrack } from "../audio/useAudioTrack";
import type { IMediaAttachment, IMediaTrim, MediaKind } from "./model";
import { sameTrim, storedTrim } from "./attachments";

interface IPersistedAudioTrim {
  libraryReady: boolean;
  audioTarget: IMediaAttachment | undefined;
  audio: Pick<ReturnType<typeof useAudioTrack>, "source" | "trim">;
  pending: "import" | "hydrate" | undefined;
  trackScope: string;
  loaded: RefObject<Record<MediaKind, { scope: string; assetId: string | null }>>;
  loadedFile: RefObject<Partial<Record<MediaKind, File>>>;
  tokens: RefObject<Record<MediaKind, number>>;
  updateTrim: (
    kind: MediaKind,
    trim: IMediaTrim | null,
    expectedAssetId?: string,
  ) => Promise<unknown>;
}
interface ITrimSave {
  scope: string;
  assetId: string;
  persist: () => Promise<unknown>;
}
const TRIM_SAVE_MS = 400;

export function usePersistedAudioTrim(props: IPersistedAudioTrim) {
  const {
    libraryReady,
    audioTarget,
    audio,
    pending,
    trackScope,
    loaded,
    loadedFile,
    tokens,
    updateTrim,
  } = props;
  const { source: audioSource, trim: audioTrim } = audio;
  const queued = useRef<ITrimSave | null>(null);
  useEffect(() => {
    queued.current = null;
    if (!libraryReady || !audioTarget || !audioSource || pending) return;
    if (audioSource.file !== loadedFile.current.audio) return;
    const current = loaded.current.audio;
    if (current.scope !== trackScope || current.assetId !== audioTarget.assetId) return;
    const next = storedTrim(audioTrim, audioSource.durationMs);
    if (sameTrim(next, audioTarget.trim)) return;
    const token = tokens.current.audio;
    const save = {
      scope: trackScope,
      assetId: audioTarget.assetId,
      persist: () => updateTrim("audio", next, audioTarget.assetId),
    };
    queued.current = save;
    const timer = setTimeout(() => {
      if (token === tokens.current.audio && queued.current === save) {
        queued.current = null;
        void save.persist();
      }
    }, TRIM_SAVE_MS);
    return () => clearTimeout(timer);
  }, [
    libraryReady,
    audioTarget,
    audioSource,
    audioTrim,
    pending,
    trackScope,
    updateTrim,
    loaded,
    loadedFile,
    tokens,
  ]);
  const assetId = audioTarget?.assetId;
  useEffect(
    () => () => {
      const save = queued.current;
      if (!save || save.scope !== trackScope || save.assetId !== assetId) return;
      queued.current = null;
      void save.persist();
    },
    [trackScope, assetId],
  );
}
