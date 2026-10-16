import { useEffect, useState } from "react";
import {
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, { type CSSAnimationKeyframes, type CSSStyle } from "react-native-reanimated";
import { Presets } from "react-native-pulsar";
import { colors } from "../theme/colors";
import { Icon, type IconName } from "./Icon";

interface IButton {
  label?: string;
  style?: StyleProp<ViewStyle>;
  iconStyle?: StyleProp<ViewStyle>;
  onClick?: () => void;
  onComplete?: () => void;
  state?: "default" | "loading";
  showIcon?: IconName | "none";
  largeIcon?: boolean;
  enabled?: boolean;
  disableHaptics?: boolean;
  accessibilityLabel?: string;
}
export function Button(props: IButton) {
  const {
    label,
    style,
    iconStyle,
    onClick,
    onComplete,
    state = "default",
    showIcon = "none",
    largeIcon = false,
    enabled = true,
    disableHaptics = false,
    accessibilityLabel,
  } = props;
  const [pressed, setPressed] = useState(false);
  const loading = state === "loading";
  const red = showIcon === "record" || showIcon === "square";
  useEffect(() => {
    if (!pressed) return;
    const timer = setTimeout(() => {
      setPressed(false);
      onComplete?.();
    }, 200);
    return () => clearTimeout(timer);
  }, [pressed, onComplete]);
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !enabled, busy: loading }}
      onPressIn={() => {
        setPressed(true);
        if (loading || !enabled) return;
        if (!disableHaptics) Presets.chip();
        onClick?.();
      }}
      style={[
        styles.container,
        loading && styles.loadingContainer,
        style,
        pressed && (red ? pressAnimationRecord : pressAnimation),
        red && styles.record,
      ]}
    >
      {loading ? (
        <Animated.View style={[rotateAnimation, styles.loader]}>
          <Icon name="loader" size={24} color={colors.navy} />
        </Animated.View>
      ) : (
        <View style={[largeIcon ? styles.largeIconRow : styles.row, !enabled && styles.disabled]}>
          {label ? <Text style={styles.text}>{label}</Text> : null}
          {showIcon !== "none" && (
            <View style={[largeIcon ? styles.largeArrowIcon : styles.arrowIcon, iconStyle]}>
              <Icon
                name={showIcon}
                size={largeIcon ? 22 : 18}
                color={red ? colors.red : colors.navy}
              />
            </View>
          )}
        </View>
      )}
    </AnimatedPressable>
  );
}
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const press = (shadow: string): CSSAnimationKeyframes => ({
  "0%": { transform: [{ translateX: 0 }, { translateY: 0 }], boxShadow: `-3px 3px 0px ${shadow}` },
  "50%": { transform: [{ translateX: -3 }, { translateY: 3 }], boxShadow: `0px 0px 0px ${shadow}` },
  "100%": {
    transform: [{ translateX: 0 }, { translateY: 0 }],
    boxShadow: `-3px 3px 0px ${shadow}`,
  },
});
const pressAnimation: CSSStyle<ViewStyle> = {
  animationDuration: 200,
  animationTimingFunction: "ease-in",
  animationFillMode: "forwards",
  animationName: press(colors.border),
};
const pressAnimationRecord: CSSStyle<ViewStyle> = {
  ...pressAnimation,
  animationName: press(colors.red),
};
const rotateAnimation: CSSStyle<ViewStyle> = {
  animationDuration: 2500,
  animationTimingFunction: "linear",
  animationFillMode: "forwards",
  animationIterationCount: "infinite",
  animationName: {
    "0%": { transform: [{ rotate: "0deg" }] },
    "100%": { transform: [{ rotate: "360deg" }] },
  },
};
const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    boxShadow: `-3px 3px 0px ${colors.border}`,
    borderRadius: 4,
    paddingVertical: 18,
    paddingHorizontal: 10,
    borderColor: colors.border,
    borderWidth: 2,
    justifyContent: "center",
  },
  loadingContainer: { backgroundColor: colors.tag, paddingVertical: 15 },
  loader: { width: 24, height: 24, alignSelf: "center" },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  text: { textAlign: "center", fontSize: 16, color: colors.navy },
  arrowIcon: {
    width: 18,
    height: 18,
    marginLeft: 5,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
  },
  largeArrowIcon: {
    width: 22,
    height: 22,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
  },
  largeIconRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  record: {
    width: Dimensions.get("window").width - 200,
    borderColor: colors.red,
    boxShadow: `-3px 3px 0px ${colors.red}`,
  },
  disabled: { opacity: 0.5 },
});
