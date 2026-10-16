import { useEffect } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { demoColors } from "../shared/demoStyles";

interface IDot {
  active: boolean;
}
export function Dot(props: IDot) {
  const { active } = props;
  const reduced = useReducedMotion();
  const lift = useSharedValue(0);
  useEffect(() => {
    lift.set(withTiming(active ? 1 : 0, { duration: 160 }));
  }, [active, lift]);
  const style = useAnimatedStyle(() => ({
    opacity: 0.35 + 0.65 * lift.value,
    transform: reduced ? [] : [{ translateY: -14 * lift.value }, { scale: 1 + 0.25 * lift.value }],
  }));
  return <Animated.View style={[styles.dot, style]} />;
}

const styles = StyleSheet.create({
  dot: { width: 22, height: 22, borderRadius: 11, backgroundColor: demoColors.cyan },
});
