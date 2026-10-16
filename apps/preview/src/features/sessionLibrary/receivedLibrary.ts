import type { Msg } from "@buzzzz/core";
import type { ICachedPattern, IPatternLibrary } from "./model";
import {
  cachePattern,
  listCachedPatterns,
  purgeCachedConnection,
  removeCachedPattern,
  renameCachedPatterns,
} from "./patterns";
import { createReceivedPlayback, type IReceivedPlaybackOptions } from "./receivedPlayback";
import type { createPatternLibraryStorage } from "./storage";

interface IReceivedLibraryOptions extends IReceivedPlaybackOptions {
  storage: ReturnType<typeof createPatternLibraryStorage>;
}

export function createReceivedLibrary(options: IReceivedLibraryOptions) {
  const playback = createReceivedPlayback(options);
  const listeners = new Set<() => void>();
  let library: IPatternLibrary = {};
  let hydrated = false;
  let storageError: string | null = null;
  let mounted = true;
  let generation = 0;
  let playbackIntent = 0;
  let pendingPlay: { connectionId: string; resourceId: string } | null = null;
  let state: ReturnType<typeof playback.getSnapshot> & {
    library: IPatternLibrary;
    hydrated: boolean;
    storageError: string | null;
  } = { ...playback.getSnapshot(), library, hydrated, storageError };
  const publish = () => {
    if (!mounted) return;
    state = { ...playback.getSnapshot(), library, hydrated, storageError };
    for (const listener of listeners) listener();
  };
  playback.subscribe(publish);
  const cancelPendingPlay = () => {
    playbackIntent++;
    pendingPlay = null;
  };
  const control = (action: () => void) => () => {
    cancelPendingPlay();
    action();
  };
  const persist = async (change?: (previous: IPatternLibrary) => IPatternLibrary) => {
    const id = generation;
    try {
      const next = change ? await options.storage.update(change) : await options.storage.load();
      if (!mounted || id !== generation) return;
      library = next;
      hydrated = true;
      storageError = null;
      publish();
    } catch (failure) {
      if (mounted && id === generation) {
        storageError =
          failure instanceof Error
            ? failure.message
            : "The saved pattern library could not be updated.";
        publish();
      }
      throw failure;
    }
  };
  const hydrate = () => persist();
  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    activate: () => {
      mounted = true;
      playback.activate();
    },
    hydrate,
    setOnPlay: playback.setOnPlay,
    receive: async (connectionId: string, packet: Extract<Msg, { type: "haptic-preset" }>) => {
      if (!mounted) return;
      cancelPendingPlay();
      const receivedAt = (options.now ?? Date.now)();
      const record = listCachedPatterns(
        cachePattern({}, connectionId, packet, receivedAt),
        connectionId,
      )[0];
      playback.start(connectionId, record);
      await persist((previous) => cachePattern(previous, connectionId, record, receivedAt));
    },
    manifest: async (
      connectionId: string,
      presets: readonly Pick<ICachedPattern, "resourceId" | "name">[],
    ) => {
      if (!mounted) return;
      const id = generation;
      await persist((previous) => renameCachedPatterns(previous, connectionId, presets));
      if (mounted && id === generation) playback.rename(connectionId, presets);
    },
    play: async (connectionId: string, resourceId: string) => {
      if (!mounted) return;
      cancelPendingPlay();
      const id = playbackIntent;
      pendingPlay = { connectionId, resourceId };
      const mountedAt = generation;
      try {
        await hydrate();
      } finally {
        if (id === playbackIntent) pendingPlay = null;
      }
      if (!mounted || mountedAt !== generation || id !== playbackIntent) return;
      const record = listCachedPatterns(library, connectionId).find(
        (item) => item.resourceId === resourceId,
      );
      if (record) playback.start(connectionId, record);
    },
    pause: control(playback.pause),
    stop: control(playback.stop),
    seek: (timeMs: number) => {
      cancelPendingPlay();
      playback.seek(timeMs);
    },
    scrub: playback.scrub,
    togglePlay: control(playback.togglePlay),
    dismiss: control(playback.dismiss),
    remove: async (connectionId: string, resourceId: string) => {
      if (!mounted) return;
      if (pendingPlay?.connectionId === connectionId && pendingPlay.resourceId === resourceId)
        cancelPendingPlay();
      const active = playback.getSnapshot().active;
      if (active?.connectionId === connectionId && active.record.resourceId === resourceId)
        playback.dismiss();
      await persist((previous) => removeCachedPattern(previous, connectionId, resourceId));
    },
    purge: async (connectionId: string) => {
      if (!mounted) return;
      if (pendingPlay?.connectionId === connectionId) cancelPendingPlay();
      if (playback.getSnapshot().active?.connectionId === connectionId) playback.dismiss();
      await persist((previous) => purgeCachedConnection(previous, connectionId));
    },
    dispose: () => {
      if (!mounted) return;
      mounted = false;
      generation++;
      cancelPendingPlay();
      playback.dispose();
    },
  };
}
