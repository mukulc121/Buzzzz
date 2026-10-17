import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { font } from "../theme/typography";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { Theme } from "../theme/colors";
import type { TTriggerRole } from "../features/preview/triggerRole";
import { PressableScale } from "./PressableScale";

interface ITriggerChip {
  name: string;
  role: TTriggerRole;
  t: Theme;
  firedAt: number;
  onPress: () => void;
}
export function TriggerChip(props: ITriggerChip) {
  const { name, role, t, firedAt, onPress } = props;
  const flash = useSharedValue(0);
  useEffect(() => {
    if (!firedAt) return;
    flash.set(1);
    flash.set(withTiming(0, { duration: 700, reduceMotion: ReduceMotion.System }));
  }, [firedAt, flash]);
  const dot = { haptic: t.highlight, control: t.fg2, unmapped: t.line };
  const wash = useAnimatedStyle(() => ({ opacity: flash.get() * 0.25 }));

  return (
    <PressableScale
      onPress={onPress}
      accessibilityLabel={`${name}, ${ROLE_LABEL[role]}`}
      style={[chip.base, { borderColor: t.line, backgroundColor: t.panel }]}
    >
      <Animated.View
        style={[StyleSheet.absoluteFill, chip.wash, { backgroundColor: t.highlight }, wash]}
      />
      <View style={[chip.dot, { backgroundColor: dot[role] }]} />
      <Text style={[chip.text, { color: t.fg }]}>{name}</Text>
    </PressableScale>
  );
}

const ROLE_LABEL = {
  haptic: "haptic mapped",
  control: "animation control",
  unmapped: "no haptic mapped",
} satisfies Record<TTriggerRole, string>;

const chip = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    minHeight: 44,
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  wash: { borderRadius: 4 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  text: {
    fontSize: 14,
    ...font.medium,
  },
});
