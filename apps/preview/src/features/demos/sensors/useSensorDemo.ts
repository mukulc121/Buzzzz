import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { AppState, Platform } from "react-native";
import {
  SensorType,
  useAnimatedReaction,
  useAnimatedSensor,
  useSharedValue,
} from "react-native-reanimated";
import { useRealtimeComposer } from "react-native-pulsar";
import { scheduleOnUI } from "react-native-worklets";
import { advanceSensor, SENSOR_INITIAL_STATE, sensorTypeForPlatform } from "./sensorPhysics";

export function useSensorDemo() {
  const isAndroid = Platform.OS === "android";
  const sensor = useAnimatedSensor(SensorType[sensorTypeForPlatform(isAndroid)]);
  const composer = useRealtimeComposer();
  const { stop, set, playDiscrete } = composer;
  const active = useSharedValue(false);
  const state = useSharedValue(SENSOR_INITIAL_STATE);
  useFocusEffect(
    useCallback(() => {
      const syncActivity = (next: string) => {
        scheduleOnUI(() => {
          "worklet";
          const enabled = next === "active";
          active.set(enabled);
          if (!enabled) stop();
        });
      };
      syncActivity(AppState.currentState);
      const subscription = AppState.addEventListener("change", syncActivity);
      return () => {
        subscription.remove();
        syncActivity("inactive");
      };
    }, [active, stop]),
  );
  useAnimatedReaction(
    () => ({ active: active.get(), x: sensor.sensor.get().x, y: sensor.sensor.get().y }),
    (reading) => {
      if (!reading.active) return;
      const next = advanceSensor({
        state: state.get(),
        sensorX: reading.x,
        sensorY: reading.y,
        isAndroid,
        now: Date.now(),
      });
      state.set(next.state);
      if (next.discrete) playDiscrete(next.discrete.amplitude, next.discrete.frequency);
      if (next.continuous.kind === "set") {
        set(next.continuous.amplitude, next.continuous.frequency);
      } else stop();
    },
  );
  return state;
}
