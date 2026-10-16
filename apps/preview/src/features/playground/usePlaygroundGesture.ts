import { useCallback, useEffect } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "expo-router";
import {
  useLongPressGesture,
  usePanGesture,
  useSimultaneousGestures,
  useTapGesture,
} from "react-native-gesture-handler";
import { useSharedValue, type SharedValue } from "react-native-reanimated";
import { useRealtimeComposer } from "react-native-pulsar";
import { scheduleOnRN, scheduleOnUI } from "react-native-worklets";
import { indicatorPosition, padValue, type IPlaygroundEvent } from "./recording";

interface IPlaygroundGesture {
  size: SharedValue<{ width: number; height: number }>;
  tapPosition: SharedValue<{ x: number; y: number }>;
  panPosition: SharedValue<{ x: number; y: number }>;
  tutorial: boolean;
  onOnboarding: (step: 2 | 3) => void;
  recordEvent: (type: IPlaygroundEvent["type"], x: number, y: number) => void;
}

export function usePlaygroundGesture(props: IPlaygroundGesture) {
  const { size, tapPosition, panPosition, tutorial, onOnboarding, recordEvent } = props;
  const { set, stop, playDiscrete } = useRealtimeComposer();
  const tapTimer = useSharedValue<ReturnType<typeof setTimeout> | null>(null);
  const pressTimer = useSharedValue<ReturnType<typeof setInterval> | null>(null);
  const clearPress = useCallback(() => {
    "worklet";
    const timer = pressTimer.get();
    if (timer !== null) clearInterval(timer);
    pressTimer.set(null);
  }, [pressTimer]);
  const reset = useCallback(() => {
    "worklet";
    clearPress();
    const timer = tapTimer.get();
    if (timer !== null) clearTimeout(timer);
    tapTimer.set(null);
    tapPosition.set({ x: -100, y: -100 });
    panPosition.set({ x: -100, y: -100 });
    stop();
  }, [clearPress, panPosition, stop, tapPosition, tapTimer]);
  useFocusEffect(useCallback(() => () => scheduleOnUI(reset), [reset]));
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") scheduleOnUI(reset);
    });
    return () => subscription.remove();
  }, [reset]);
  const tap = useTapGesture({
    onActivate: (event) => {
      const bounds = size.get();
      const value = padValue(event.x, event.y, bounds.width, bounds.height, tutorial);
      playDiscrete(value.amplitude, value.frequency);
      if (tutorial) scheduleOnRN(onOnboarding, 2);
      else recordEvent("tap", value.frequency, value.amplitude);
      tapPosition.set(indicatorPosition(event.x, event.y, bounds.width, bounds.height));
      tapTimer.set(setTimeout(() => tapPosition.set({ x: -100, y: -100 }), 100));
    },
  });
  const pan = usePanGesture({
    onActivate: () => {
      if (!tutorial) recordEvent("pan", 0, 0);
    },
    onUpdate: (event) => {
      const bounds = size.get();
      const value = padValue(event.x, event.y, bounds.width, bounds.height, tutorial);
      set(value.amplitude, value.frequency);
      if (!tutorial) recordEvent("pan", value.frequency, value.amplitude);
      panPosition.set(indicatorPosition(event.x, event.y, bounds.width, bounds.height));
    },
    onDeactivate: () => {
      if (!tutorial) return;
      scheduleOnRN(onOnboarding, 3);
      stop();
      panPosition.set({ x: -100, y: -100 });
    },
    onFinalize: () => {
      if (tutorial) return;
      stop();
      panPosition.set({ x: -100, y: -100 });
      recordEvent("pan", 0, 0);
    },
  });
  const press = useLongPressGesture({
    enabled: !tutorial,
    minDuration: 100,
    onActivate: (event) => {
      clearPress();
      const bounds = size.get();
      const value = padValue(event.x, event.y, bounds.width, bounds.height);
      playDiscrete(value.amplitude, value.frequency);
      recordEvent("tap", value.frequency, value.amplitude);
      pressTimer.set(
        setInterval(() => {
          playDiscrete(value.amplitude, value.frequency);
          recordEvent("tap", value.frequency, value.amplitude);
        }, 80),
      );
    },
    onFinalize: clearPress,
  });
  return useSimultaneousGestures(tap, press, pan);
}
