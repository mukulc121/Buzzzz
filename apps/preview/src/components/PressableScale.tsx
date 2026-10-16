import type { ReactNode } from "react";
import { Pressable, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
interface IPressableScale {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}
export function PressableScale(props: IPressableScale) {
  const { children, style, onPress, disabled, accessibilityLabel } = props;
  const scale = useSharedValue(1);
  const motion = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  const to = (value: number) => {
    scale.set(withTiming(value, { duration: 100, reduceMotion: ReduceMotion.System }));
  };
  return (
    <AnimatedPressable
      style={[style, motion]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      accessibilityLabel={accessibilityLabel}
      onPressIn={() => to(0.98)}
      onPressOut={() => to(1)}
    >
      {children}
    </AnimatedPressable>
  );
}
