import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Text, View, type GestureResponderEvent } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import Svg, { Line } from "react-native-svg";
import { useRealtimeComposer } from "react-native-pulsar";
import { useFocusEffect } from "expo-router";
import type { Theme } from "../../theme/colors";
import { font } from "../../theme/typography";
import { padValue } from "./recording";

interface ITouchPad {
  t: Theme;
  onSample: (value: ReturnType<typeof padValue> | null) => void;
  onTap: (value: ReturnType<typeof padValue>) => void;
}
export function TouchPad(props: ITouchPad) {
  const { t, onSample, onTap } = props;
  const { set, stop, playDiscrete } = useRealtimeComposer();
  const bounds = useRef({ width: 1, height: 1 });
  const start = useRef({ x: 0, y: 0, moved: false });
  const [value, setValue] = useState({ amplitude: 0.5, frequency: 0.5 });
  const latest = useRef(value);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const active = useSharedValue(0);
  const dot = useAnimatedStyle(() => ({
    opacity: active.get(),
    transform: [{ translateX: x.get() - 12 }, { translateY: y.get() - 12 }],
  }));
  useFocusEffect(
    useCallback(
      () => () => {
        stop();
        active.set(0);
      },
      [stop, active],
    ),
  );
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") {
        stop();
        active.set(0);
      }
    });
    return () => sub.remove();
  }, [stop, active]);
  const read = (event: GestureResponderEvent) => {
    const { locationX, locationY } = event.nativeEvent;
    x.set(Math.max(0, Math.min(bounds.current.width, locationX)));
    y.set(Math.max(0, Math.min(bounds.current.height, locationY)));
    const next = padValue(locationX, locationY, bounds.current.width, bounds.current.height);
    latest.current = next;
    setValue(next);
    return next;
  };
  const finish = (cancelled: boolean) => {
    active.set(0);
    if (start.current.moved) {
      stop();
      onSample(null);
    } else if (!cancelled) {
      playDiscrete(latest.current.amplitude, latest.current.frequency);
      onTap(latest.current);
    }
  };
  return (
    <View style={{ gap: 10 }}>
      <View
        accessibilityLabel="Haptic touch playground. Horizontal position controls frequency; vertical position controls intensity."
        onLayout={({ nativeEvent }) => {
          bounds.current = nativeEvent.layout;
        }}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={(event) => {
          start.current = {
            x: event.nativeEvent.locationX,
            y: event.nativeEvent.locationY,
            moved: false,
          };
          active.set(1);
          read(event);
        }}
        onResponderMove={(event) => {
          const next = read(event);
          const { locationX, locationY } = event.nativeEvent;
          if (Math.hypot(locationX - start.current.x, locationY - start.current.y) > 6)
            start.current.moved = true;
          if (start.current.moved) {
            set(next.amplitude, next.frequency);
            onSample(next);
          }
        }}
        onResponderRelease={() => finish(false)}
        onResponderTerminate={() => finish(true)}
        style={{
          height: 310,
          backgroundColor: t.panel,
          borderWidth: 1,
          borderColor: t.highlight,
          borderRadius: 4,
          overflow: "hidden",
        }}
      >
        <View pointerEvents="none" style={{ flex: 1 }}>
          <Svg width="100%" height="100%" viewBox="0 0 300 300" preserveAspectRatio="none">
            {Array.from({ length: 16 }, (_, i) => (
              <Line
                key={`v${i}`}
                x1={i * 20}
                x2={i * 20}
                y1={0}
                y2={300}
                stroke={t.line}
                strokeWidth={0.8}
              />
            ))}
            {Array.from({ length: 16 }, (_, i) => (
              <Line
                key={`h${i}`}
                x1={0}
                x2={300}
                y1={i * 20}
                y2={i * 20}
                stroke={t.line}
                strokeWidth={0.8}
              />
            ))}
          </Svg>
          <Animated.View
            style={[
              {
                position: "absolute",
                top: 0,
                left: 0,
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: t.highlight,
                borderWidth: 2,
                borderColor: t.fg,
              },
              dot,
            ]}
          />
        </View>
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
        {(["amplitude", "frequency"] as const).map((axis) => (
          <View
            key={axis}
            accessible
            accessibilityRole="adjustable"
            accessibilityLabel={axis === "amplitude" ? "Intensity" : "Frequency"}
            accessibilityValue={{ min: 0, max: 100, now: Math.round(value[axis] * 100) }}
            accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
            onAccessibilityAction={({ nativeEvent }) => {
              if (!["increment", "decrement"].includes(nativeEvent.actionName)) return;
              const next = {
                ...latest.current,
                [axis]: Math.max(
                  0,
                  Math.min(
                    1,
                    latest.current[axis] + (nativeEvent.actionName === "increment" ? 0.1 : -0.1),
                  ),
                ),
              };
              latest.current = next;
              setValue(next);
              playDiscrete(next.amplitude, next.frequency);
              onTap(next);
            }}
          >
            <Text style={{ ...font.medium, color: t.fg2, fontSize: 14 }}>
              {axis === "amplitude" ? "Intensity" : "Frequency"} {Math.round(value[axis] * 100)}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
