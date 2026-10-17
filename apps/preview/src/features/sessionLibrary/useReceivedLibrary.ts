import { useEffect, useLayoutEffect, useState, useSyncExternalStore } from "react";
import { usePatternComposer } from "react-native-pulsar";
import { createReceivedLibrary } from "./receivedLibrary";
import { createResourceStorage } from "./resourceStorage";
import { createMediaFiles } from "./mediaFiles";

interface IReceivedLibrary {
  onPlay?: () => void;
  onReceive?: (connectionId: string) => void;
}

export function useReceivedLibrary(options: IReceivedLibrary = {}) {
  const { parse, play, stop } = usePatternComposer();
  const [controller] = useState(() =>
    createReceivedLibrary({
      storage: createResourceStorage(),
      files: createMediaFiles(),
      composer: { parse, play, stop },
    }),
  );
  useLayoutEffect(() => {
    controller.setOnPlay(options.onPlay);
    controller.setOnReceive(options.onReceive);
  }, [controller, options.onPlay, options.onReceive]);
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );
  useEffect(() => {
    controller.activate();
    void controller.hydrate().catch(() => undefined);
    return controller.dispose;
  }, [controller]);
  return {
    ...state,
    receive: controller.receive,
    manifest: controller.manifest,
    play: controller.play,
    togglePlay: controller.togglePlay,
    pause: controller.pause,
    stop: controller.stop,
    seek: controller.seek,
    scrub: controller.scrub,
    dismiss: controller.dismiss,
    remove: controller.remove,
    purge: controller.purge,
  };
}
