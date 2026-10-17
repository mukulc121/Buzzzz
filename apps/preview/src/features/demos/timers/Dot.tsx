import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { AppState, StyleSheet } from "react-native";
import Animated, { type CSSAnimationKeyframes } from "react-native-reanimated";
import { usePatternComposer, type Pattern } from "react-native-pulsar";
import { DOT_CYCLE_MS, DOT_STAGGER_MS, firstDotImpact } from "./dots";

const WAVE: CSSAnimationKeyframes = {
  "0%": { transform: [{ translateY: 0 }] },
  "14%": { transform: [{ translateY: -30 }] },
  "28%": { transform: [{ translateY: 0 }] },
  "100%": { transform: [{ translateY: 0 }] },
};

interface IDot {
  index: number;
  pattern: Pattern;
  color: string;
}
export function Dot(props: IDot) {
  const { index, pattern, color } = props;
  const { play, stop } = usePatternComposer(pattern);
  const [epoch, setEpoch] = useState(0);
  useFocusEffect(
    useCallback(() => {
      let timeout: ReturnType<typeof setTimeout> | undefined;
      let interval: ReturnType<typeof setInterval> | undefined;
      const clear = () => {
        clearTimeout(timeout);
        clearInterval(interval);
        stop();
      };
      const start = () => {
        clear();
        setEpoch((value) => value + 1);
        timeout = setTimeout(() => {
          play();
          interval = setInterval(play, DOT_CYCLE_MS);
        }, firstDotImpact(index));
      };
      if (AppState.currentState === "active") start();
      const subscription = AppState.addEventListener("change", (state) => {
        if (state === "active") start();
        else clear();
      });
      return () => {
        subscription.remove();
        clear();
      };
    }, [index, play, stop]),
  );
  return (
    <Animated.View
      key={epoch}
      style={[
        styles.dot,
        {
          backgroundColor: color,
          animationName: WAVE,
          animationDuration: DOT_CYCLE_MS,
          animationDelay: index * DOT_STAGGER_MS,
          animationIterationCount: "infinite",
          animationTimingFunction: "ease-in-out",
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  dot: { width: 12, height: 12, borderRadius: 6 },
});
