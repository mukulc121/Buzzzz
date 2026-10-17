import { useEffect, useState, useSyncExternalStore } from "react";
import { usePatternComposer } from "react-native-pulsar";
import { COUNTDOWN_PATTERNS } from "./countdown";
import { createCountdownController } from "./countdownController";

export function useCountdown() {
  const soft = usePatternComposer(COUNTDOWN_PATTERNS.soft);
  const strong = usePatternComposer(COUNTDOWN_PATTERNS.strong);
  const done = usePatternComposer(COUNTDOWN_PATTERNS.done);
  const [controller] = useState(() =>
    createCountdownController({ play: (kind) => ({ soft, strong, done })[kind].play() }),
  );
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );
  useEffect(() => {
    controller.activate();
    return controller.dispose;
  }, [controller]);
  return { state, start: controller.start, reset: controller.reset };
}
