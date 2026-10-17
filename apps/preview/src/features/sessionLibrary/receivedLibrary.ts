import type { Msg } from "@buzzzz/core";
import type { ICachedResource, IMediaFiles, IMediaLibrary } from "./mediaModel";
import { receivedPatternRecord } from "./receivedPattern";
import { createReceivedMediaCache } from "./mediaCache";
import { validateMediaDownload } from "./mediaDownload";
import { receivedMediaRecord } from "./receivedMedia";
import {
  listMediaResources,
  upsertMediaResource,
  renameMediaResources,
  removeMediaResource,
  purgeMediaConnection,
} from "./mediaStorage";
import { createReceivedPlayback, type IReceivedPlaybackOptions } from "./receivedPlayback";
import type { IResourceStorage } from "./resourceStorage";
import { createReceiptOrder } from "./receiptOrder";

interface IReceivedLibraryOptions extends IReceivedPlaybackOptions {
  storage: IResourceStorage;
  files?: IMediaFiles;
  request?: Parameters<typeof validateMediaDownload>[2];
  onReceive?: (connectionId: string) => void;
}

type Receipt = Extract<Msg, { type: "haptic-preset" | "audio-haptics" | "animation-haptics" }>;

export function createReceivedLibrary(options: IReceivedLibraryOptions) {
  const playback = createReceivedPlayback(options);
  const cache = options.files
    ? createReceivedMediaCache({ files: options.files, storage: options.storage, now: options.now })
    : undefined;
  const listeners = new Set<() => void>();
  const receipts = createReceiptOrder();
  let library: IMediaLibrary = {};
  let hydrated = false;
  let storageError: string | null = null;
  let downloading = false;
  let downloadProgress = 0;
  let downloadOwner: number | null = null;
  let onReceive = options.onReceive;
  let mounted = true;
  let generation = 0;
  let playbackIntent = 0;
  let controlIntent = 0;
  let pendingPlay: { connectionId: string; resourceId: string } | null = null;
  const snapshot = () => ({
    ...playback.getSnapshot(),
    library,
    hydrated,
    storageError,
    downloading,
    downloadProgress,
  });
  let state = snapshot();
  const publish = () => {
    if (!mounted) return;
    state = snapshot();
    for (const listener of listeners) listener();
  };
  playback.subscribe(publish);
  const cancelPendingPlay = () => {
    playbackIntent++;
    pendingPlay = null;
  };
  const clearDownload = () => {
    downloadOwner = null;
    downloading = false;
    downloadProgress = 0;
  };
  const control = (action: () => void) => () => {
    controlIntent++;
    cancelPendingPlay();
    action();
  };
  const persist = async (operation = () => options.storage.load()) => {
    const id = generation;
    try {
      const next = await operation();
      if (!mounted || id !== generation) return;
      library = next;
      hydrated = true;
      storageError = null;
      publish();
    } catch (failure) {
      if (mounted && id === generation) {
        storageError =
          failure instanceof Error ? failure.message : "The saved library could not be updated.";
        publish();
      }
      throw failure;
    }
  };
  const hydrate = () => persist();
  const receive = async (connectionId: string, packet: Receipt, relayAddress?: string) => {
    if (!mounted) return;
    const beforeControl = controlIntent;
    const mountedAt = generation;
    const accept = receipts.begin(connectionId, packet.resourceId);
    if (packet.type === "haptic-preset") {
      accept();
      cancelPendingPlay();
      const intent = playbackIntent;
      pendingPlay = { connectionId, resourceId: packet.resourceId };
      clearDownload();
      const receivedAt = (options.now ?? Date.now)();
      const record = receivedPatternRecord(packet, receivedAt);
      onReceive?.(connectionId);
      playback.start(connectionId, record);
      await persist(() =>
        cache
          ? cache.savePattern(connectionId, record)
          : options.storage.update((previous) =>
              upsertMediaResource(previous, connectionId, record),
            ),
      );
      if (intent === playbackIntent) pendingPlay = null;
      return;
    }
    if (!cache || !relayAddress) throw new Error("The Studio media connection is unavailable.");
    await validateMediaDownload(packet, relayAddress, options.request);
    if (!mounted || generation !== mountedAt) return;
    const receipt = accept();
    if (!receipt) return;
    const current = () => mounted && generation === mountedAt && receipt.current();
    let intent: number | null = null;
    if (receipt.newest && beforeControl === controlIntent) {
      cancelPendingPlay();
      intent = playbackIntent;
      pendingPlay = { connectionId, resourceId: packet.resourceId };
      downloading = true;
      downloadProgress = 0;
      downloadOwner = intent;
      onReceive?.(connectionId);
      playback.prepare(connectionId, receivedMediaRecord(connectionId, packet, 0));
    }
    try {
      const ready = await cache.receive(connectionId, packet, (progress) => {
        if (intent !== null && current() && downloadOwner === intent) {
          downloadProgress = Math.max(0, Math.min(1, progress));
          publish();
        }
      });
      if (!ready) return;
      await hydrate();
      if (!current()) return;
      if (intent !== null && downloadOwner === intent) {
        clearDownload();
        playback.resolve(connectionId, ready);
      }
      if (intent !== null && intent === playbackIntent)
        playback.start(connectionId, ready.record, 0, ready);
      else publish();
    } catch (error) {
      if (intent !== null && current() && downloadOwner === intent) {
        clearDownload();
        playback.fail(error);
      }
      throw error;
    } finally {
      if (intent === playbackIntent) pendingPlay = null;
    }
  };
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
    setOnReceive: (callback: IReceivedLibraryOptions["onReceive"]) => {
      onReceive = callback;
    },
    receive,
    manifest: async (
      connectionId: string,
      presets: readonly Pick<ICachedResource, "resourceId" | "name">[],
    ) => {
      if (!mounted) return;
      const id = generation;
      await persist(() =>
        cache
          ? cache.manifest(connectionId, presets)
          : options.storage.update((previous) =>
              renameMediaResources(previous, connectionId, presets),
            ),
      );
      if (mounted && id === generation) playback.rename(connectionId, presets);
    },
    play: async (connectionId: string, resourceId: string) => {
      if (!mounted) return;
      controlIntent++;
      cancelPendingPlay();
      const id = playbackIntent;
      pendingPlay = { connectionId, resourceId };
      const mountedAt = generation;
      try {
        await hydrate();
        if (!mounted || mountedAt !== generation || id !== playbackIntent) return;
        const ready = cache ? await cache.get(connectionId, resourceId) : undefined;
        if (!mounted || mountedAt !== generation || id !== playbackIntent) return;
        const record =
          ready?.record ??
          listMediaResources(library, connectionId).find((item) => item.resourceId === resourceId);
        if (record) {
          clearDownload();
          playback.start(
            connectionId,
            record,
            0,
            ready ?? { clipMissing: record.kind !== "pattern" },
          );
        }
      } finally {
        if (id === playbackIntent) pendingPlay = null;
      }
    },
    pause: control(playback.pause),
    stop: control(playback.stop),
    seek: (timeMs: number) => {
      controlIntent++;
      cancelPendingPlay();
      playback.seek(timeMs);
    },
    scrub: playback.scrub,
    togglePlay: control(playback.togglePlay),
    dismiss: () => {
      controlIntent++;
      clearDownload();
      cancelPendingPlay();
      playback.dismiss();
    },
    remove: async (connectionId: string, resourceId: string) => {
      if (!mounted) return;
      receipts.remove(connectionId, resourceId);
      if (pendingPlay?.connectionId === connectionId && pendingPlay.resourceId === resourceId)
        cancelPendingPlay();
      const active = playback.getSnapshot().active;
      if (active?.connectionId === connectionId && active.record.resourceId === resourceId) {
        clearDownload();
        playback.dismiss();
      }
      await persist(async () => {
        if (cache) {
          await cache.remove(connectionId, resourceId);
          return options.storage.load();
        }
        return options.storage.update((previous) =>
          removeMediaResource(previous, connectionId, resourceId),
        );
      });
    },
    purge: async (connectionId: string) => {
      if (!mounted) return;
      receipts.purge(connectionId);
      if (pendingPlay?.connectionId === connectionId) cancelPendingPlay();
      if (playback.getSnapshot().active?.connectionId === connectionId) {
        clearDownload();
        playback.dismiss();
      }
      await persist(async () => {
        if (cache) {
          await cache.purge(connectionId);
          return options.storage.load();
        }
        return options.storage.update((previous) => purgeMediaConnection(previous, connectionId));
      });
    },
    dispose: () => {
      if (!mounted) return;
      mounted = false;
      generation++;
      clearDownload();
      cancelPendingPlay();
      playback.dispose();
    },
  };
}
