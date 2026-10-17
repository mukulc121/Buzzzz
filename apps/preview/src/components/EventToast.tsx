import { useEffect } from "react";
import { StyleSheet, Text } from "react-native";
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import type { Theme } from "../theme/colors";
import { font } from "../theme/typography";
interface IEventToast {
  event: { id: number; text: string } | null;
  t: Theme;
}
export function EventToast(props: IEventToast) {
  const { event, t } = props;
  const opacity = useSharedValue(0);
  useEffect(() => {
    if (event)
      opacity.set(
        withSequence(
          withTiming(1, { duration: 180, reduceMotion: ReduceMotion.System }),
          withDelay(1400, withTiming(0, { duration: 180, reduceMotion: ReduceMotion.System })),
        ),
      );
  }, [event, opacity]);
  const animated = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    transform: [{ translateY: (1 - opacity.get()) * 12 }],
  }));
  if (!event) return null;
  return (
    <Animated.View pointerEvents="none" style={[toast.base, { backgroundColor: t.fg }, animated]}>
      <Text style={{ color: t.bg, fontSize: 14, ...font.medium }}>{event.text}</Text>
    </Animated.View>
  );
}
const toast = StyleSheet.create({
  base: {
    position: "absolute",
    bottom: 92,
    alignSelf: "center",
    maxWidth: "90%",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
});
