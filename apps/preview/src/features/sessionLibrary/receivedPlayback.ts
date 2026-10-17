import type { PatternComposer } from "react-native-pulsar";
import type { ICachedResource, IResolvedResource } from "./mediaModel";
import { patternStartingAt } from "./patternStartingAt";
import { resourcePlaybackPattern } from "./mediaPlayback";

export interface IReceivedPlaybackOptions {
  composer: Pick<PatternComposer, "parse" | "play" | "stop">;
  onPlay?: () => void;
  now?: () => number;
  requestFrame?: (callback: () => void) => number;
  cancelFrame?: (id: number) => void;
}
interface IReceivedPlaybackState {
  active: (IResolvedResource & { connectionId: string }) | null;
  playing: boolean;
  positionMs: number;
  error: string | null;
}

export function createReceivedPlayback(options: IReceivedPlaybackOptions) {
  const {
    composer,
    now = Date.now,
    requestFrame = requestAnimationFrame,
    cancelFrame = cancelAnimationFrame,
  } = options;
  let onPlay = options.onPlay;
  const listeners = new Set<() => void>();
  let state: IReceivedPlaybackState = { active: null, playing: false, positionMs: 0, error: null };
  let positionMs = 0;
  let scrubMs: number | null = null;
  let frame: number | undefined;
  let generation = 0;
  let mounted = true;
  let ownsNative = false;
  const publish = (change: Partial<IReceivedPlaybackState> = {}) => {
    state = { ...state, ...change, positionMs: scrubMs ?? positionMs };
    if (mounted) for (const listener of listeners) listener();
  };
  const cancelClock = () => {
    generation++;
    if (frame !== undefined) cancelFrame(frame);
    frame = undefined;
  };
  const stopNative = () => {
    if (!ownsNative) return;
    ownsNative = false;
    composer.stop();
  };
  const pause = () => {
    if (!mounted) return;
    cancelClock();
    try {
      stopNative();
      publish({ playing: false });
    } catch (error) {
      publish({
        playing: false,
        error: error instanceof Error ? error.message : "Pattern playback could not stop.",
      });
    }
  };
  const start = (
    connectionId: string,
    record: ICachedResource,
    fromMs = 0,
    media: Pick<IResolvedResource, "localUri" | "clipMissing"> = { clipMissing: false },
  ) => {
    if (!mounted) return;
    cancelClock();
    positionMs = Math.max(0, Math.min(record.durationMs, fromMs));
    scrubMs = null;
    const active = { connectionId, record, ...media };
    publish({ active, playing: false, error: null });
    try {
      onPlay?.();
      composer.stop();
      ownsNative = false;
      composer.parse(patternStartingAt(resourcePlaybackPattern(active), positionMs));
      ownsNative = true;
      composer.play();
      publish({ playing: true });
      const id = generation;
      const startedAt = now() - positionMs;
      const tick = () => {
        if (!mounted || id !== generation || !state.playing) return;
        positionMs = Math.max(0, Math.min(record.durationMs, now() - startedAt));
        if (positionMs >= record.durationMs) {
          frame = undefined;
          publish({ playing: false });
          return;
        }
        publish();
        frame = requestFrame(tick);
      };
      frame = requestFrame(tick);
    } catch (error) {
      let message = error instanceof Error ? error.message : "Pattern playback could not start.";
      try {
        stopNative();
      } catch (failure) {
        message += ` ${failure instanceof Error ? failure.message : "Pattern playback could not stop."}`;
      }
      publish({ playing: false, error: message });
    }
  };
  const seek = (timeMs: number) => {
    if (!mounted || !state.active || !Number.isFinite(timeMs)) return;
    const { connectionId, record, ...media } = state.active;
    positionMs = Math.max(0, Math.min(record.durationMs, timeMs));
    scrubMs = null;
    if (state.playing) start(connectionId, record, positionMs, media);
    else publish();
  };
  const stop = () => {
    if (!mounted) return;
    pause();
    positionMs = 0;
    scrubMs = null;
    publish();
  };
  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    activate: () => {
      mounted = true;
    },
    setOnPlay: (callback: (() => void) | undefined) => {
      onPlay = callback;
    },
    start,
    prepare: (connectionId: string, record: ICachedResource) => {
      cancelClock();
      positionMs = 0;
      scrubMs = null;
      publish({
        active: { connectionId, record, clipMissing: false },
        error: null,
        playing: false,
      });
    },
    resolve: (connectionId: string, resource: IResolvedResource) => {
      if (
        !mounted ||
        state.active?.connectionId !== connectionId ||
        state.active.record.resourceId !== resource.record.resourceId
      )
        return;
      publish({ active: { connectionId, ...resource } });
    },
    fail: (error: unknown) => {
      pause();
      publish({
        error: error instanceof Error ? error.message : "Could not load media",
        playing: false,
      });
    },
    pause,
    stop,
    seek,
    scrub: (timeMs: number | null) => {
      if (!mounted || !state.active || (timeMs !== null && !Number.isFinite(timeMs))) return;
      scrubMs =
        timeMs === null ? null : Math.max(0, Math.min(state.active.record.durationMs, timeMs));
      publish();
    },
    togglePlay: () => {
      if (!mounted || !state.active) return;
      if (state.playing) return pause();
      const { connectionId, record, ...media } = state.active;
      start(connectionId, record, positionMs >= record.durationMs ? 0 : positionMs, media);
    },
    rename: (
      connectionId: string,
      manifest: readonly Pick<ICachedResource, "resourceId" | "name">[],
    ) => {
      if (!mounted || state.active?.connectionId !== connectionId) return;
      const name = manifest.find(
        (item) => item.resourceId === state.active?.record.resourceId,
      )?.name;
      if (name && name !== state.active.record.name)
        publish({ active: { ...state.active, record: { ...state.active.record, name } } });
    },
    dismiss: () => {
      if (!mounted) return;
      stop();
      publish({ active: null });
    },
    dispose: () => {
      if (!mounted) return;
      mounted = false;
      cancelClock();
      try {
        stopNative();
        publish({ playing: false });
      } catch (error) {
        publish({
          playing: false,
          error: error instanceof Error ? error.message : "Pattern playback could not stop.",
        });
      }
    },
  };
}
