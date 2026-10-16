import { useEffect, useState } from "react";
import { StyleSheet, Text, type ViewStyle } from "react-native";
import { GestureDetector, useTapGesture } from "react-native-gesture-handler";
import Animated, { type CSSStyle } from "react-native-reanimated";

interface INotificationPlayButton {
  playing: boolean;
  onPress: () => void;
}
export function NotificationPlayButton(props: INotificationPlayButton) {
  const { playing, onPress } = props;
  const [pressed, setPressed] = useState(false);
  useEffect(() => {
    const timeout = setTimeout(() => setPressed(false), 200);
    return () => clearTimeout(timeout);
  }, [pressed]);
  const gesture = useTapGesture({
    runOnJS: true,
    onBegin: () => {
      setPressed(true);
      onPress();
    },
  });
  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[styles.button, pressed ? PRESS : null]}
        accessible
        accessibilityRole="button"
        accessibilityLabel="Play All Notifications"
      >
        <Text style={styles.label}>{playing ? "Playing... " : "Play All Notifications"}</Text>
      </Animated.View>
    </GestureDetector>
  );
}

const PRESS: CSSStyle<ViewStyle> = {
  animationDuration: 200,
  animationTimingFunction: "ease-in",
  animationFillMode: "forwards",
  animationName: {
    "0%": {
      transform: [{ translateX: 0 }, { translateY: 0 }],
      boxShadow: "-3px 3px 0px rgba(56, 172, 221, 1)",
    },
    "50%": {
      transform: [{ translateX: -3 }, { translateY: 3 }],
      boxShadow: "0px 0px 0px rgba(56, 172, 221, 1)",
    },
    "100%": {
      transform: [{ translateX: 0 }, { translateY: 0 }],
      boxShadow: "-3px 3px 0px rgba(56, 172, 221, 1)",
    },
  },
};

const styles = StyleSheet.create({
  button: {
    width: "100%",
    minHeight: 56,
    backgroundColor: "rgba(255, 255, 255, 1)",
    borderColor: "rgba(56, 172, 221, 1)",
    borderWidth: 2,
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
    boxShadow: "-3px 3px 0px rgba(56, 172, 221, 1)",
  },
  label: { fontSize: 15, color: "rgba(0, 26, 114, 1)", textAlign: "center" },
});
