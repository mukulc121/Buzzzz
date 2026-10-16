import { useEffect } from "react";
import {
  Settings,
  usePatternComposer,
  useRealtimeComposer,
  type Pattern,
} from "react-native-pulsar";
import { useAppBackground } from "./useAppBackground";

// One pattern composer + realtime composer per demo, silenced on unmount and background.
export function useDemoHaptics() {
  const composer = usePatternComposer();
  const realtime = useRealtimeComposer();
  const stop = () => {
    composer.stop();
    realtime.stop();
    Settings.stopHaptics();
  };
  const play = (pattern: Pattern) => {
    composer.stop();
    composer.parse(pattern);
    composer.play();
  };
  useAppBackground(stop);
  const stopPattern = composer.stop;
  useEffect(() => stopPattern, [stopPattern]);
  return { play, stop, realtime };
}
