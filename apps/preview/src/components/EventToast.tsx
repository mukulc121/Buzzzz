import { useEffect, useState } from "react";
import { Animated, Easing, StyleSheet, Text } from "react-native";
import type { Theme } from "../theme/colors";

interface IEventToast {
  event: { id: number; text: string } | null;
  t: Theme;
}
export function EventToast(props: IEventToast) {
  const { event, t } = props;
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!event) return;
    v.stopAnimation();
    Animated.sequence([
      Animated.timing(v, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.delay(1400),
      Animated.timing(v, {
        toValue: 0,
        duration: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [event, v]);
  if (!event) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        toast.base,
        {
          backgroundColor: t.fg,
          opacity: v,
          transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
        },
      ]}
    >
      <Text style={[toast.text, { color: t.bg }]}>{event.text}</Text>
    </Animated.View>
  );
}

const toast = StyleSheet.create({
  base: {
    position: "absolute",
    bottom: 44,
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  text: { fontSize: 14, fontWeight: "600" },
});
