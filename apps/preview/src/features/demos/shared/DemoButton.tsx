import { Pressable, Text } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import type { Theme } from "../../../theme/colors";
import { demoStyles } from "./demoStyles";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface IDemoButton {
  t: Theme;
  label: string;
  onPress?: () => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
  primary?: boolean;
  disabled?: boolean;
}
export function DemoButton(props: IDemoButton) {
  const { t, label, onPress, onPressIn, onPressOut, primary, disabled } = props;
  const s = demoStyles(t);
  const scale = useSharedValue(1);
  // withTiming defaults to ReduceMotion.System, so reduced motion skips the press scale.
  const pressed = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedPressable
      style={[s.button, primary && s.buttonPrimary, disabled && s.buttonDisabled, pressed]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => {
        scale.set(withTiming(0.96, { duration: 80 }));
        onPressIn?.();
      }}
      onPressOut={() => {
        scale.set(withTiming(1, { duration: 120 }));
        onPressOut?.();
      }}
    >
      <Text style={[s.buttonText, primary && s.buttonTextPrimary]}>{label}</Text>
    </AnimatedPressable>
  );
}
