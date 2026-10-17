import { useEffect, useLayoutEffect, useState, type RefObject } from "react";
import { useRealtimeComposer, type Pattern } from "react-native-pulsar";
import type { HapticLottieRef } from "react-native-pulsar-lottie";
import { usePlaybackClock } from "../audio/usePlaybackClock";
import { createLottiePlayback } from "./lottiePlayback";

export function useLottiePlayback(
  view: RefObject<HapticLottieRef | null>,
  pattern: Pattern,
  durationMs: number,
) {
  const realtime = useRealtimeComposer();
  const clock = usePlaybackClock(durationMs);
  const [draggedMs, setDraggedMs] = useState<number | null>(null);
  const [controller] = useState(() =>
    createLottiePlayback({
      pattern,
      durationMs,
    }),
  );
  useLayoutEffect(() => {
    controller.connect({ view: view.current, clock, realtime, onScrub: setDraggedMs });
  }, [controller, view, clock, realtime]);
  useEffect(() => {
    controller.activate();
    return controller.dispose;
  }, [controller]);
  return {
    positionMs: draggedMs ?? clock.positionMs,
    cursorMs: clock.positionMs,
    playing: clock.isRunning,
    toggle: controller.toggle,
    scrub: controller.scrub,
    seek: controller.seek,
  };
}
