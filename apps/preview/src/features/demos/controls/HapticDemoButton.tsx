import { useEffect, useState } from "react";
import { StyleSheet, Text, type StyleProp, type ViewStyle } from "react-native";
import { GestureDetector, useTapGesture } from "react-native-gesture-handler";
import Animated, { type CSSStyle } from "react-native-reanimated";
import { colors } from "../../../theme/colors";

interface IHapticDemoButton {
  label: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}
export function HapticDemoButton(props: IHapticDemoButton) {
  const { label, onPress, style } = props;
  const [pressed, setPressed] = useState(false);
  useEffect(() => {
    const timeout = setTimeout(() => setPressed(false), 200);
    return () => clearTimeout(timeout);
  }, [pressed]);
  const press = () => {
    setPressed(true);
    onPress();
  };
  const gesture = useTapGesture({ runOnJS: true, onBegin: press });
  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[styles.button, pressed ? PRESS : null, style]}
        accessible
        accessibilityRole="button"
        accessibilityLabel={label}
        onAccessibilityTap={press}
      >
        <Text style={styles.label}>{label}</Text>
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
      boxShadow: `-3px 3px 0px ${colors.border}`,
    },
    "50%": {
      transform: [{ translateX: -3 }, { translateY: 3 }],
      boxShadow: `0px 0px 0px ${colors.border}`,
    },
    "100%": {
      transform: [{ translateX: 0 }, { translateY: 0 }],
      boxShadow: `-3px 3px 0px ${colors.border}`,
    },
  },
};
const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderWidth: 2,
    borderRadius: 4,
    minHeight: 56,
    justifyContent: "center",
    alignItems: "center",
    boxShadow: `-3px 3px 0px ${colors.border}`,
  },
  label: { fontSize: 15, color: colors.navy, textAlign: "center" },
});
