import { useState, type ReactNode } from "react";
import { Animated, Pressable, type StyleProp, type ViewStyle } from "react-native";

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
  const [scale] = useState(() => new Animated.Value(1));
  const to = (v: number) =>
    Animated.spring(scale, { toValue: v, useNativeDriver: true, speed: 40, bounciness: 0 }).start();
  return (
    <AnimatedPressable
      style={[style, { transform: [{ scale }] }]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      accessibilityLabel={accessibilityLabel}
      onPressIn={() => to(0.97)}
      onPressOut={() => to(1)}
    >
      {children}
    </AnimatedPressable>
  );
}
