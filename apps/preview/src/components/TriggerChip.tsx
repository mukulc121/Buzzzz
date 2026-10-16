import { useEffect, useState } from "react";
import { Animated, Easing, Platform, StyleSheet, Text, View } from "react-native";
import type { Theme } from "../theme/colors";
import { PressableScale } from "./PressableScale";

interface ITriggerChip {
  name: string;
  mapped: boolean;
  t: Theme;
  firedAt: number;
  onPress: () => void;
}
export function TriggerChip(props: ITriggerChip) {
  const { name, mapped, t, firedAt, onPress } = props;
  const [flash] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!firedAt) return;
    flash.setValue(1);
    Animated.timing(flash, {
      toValue: 0,
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [firedAt, flash]);

  return (
    <PressableScale
      onPress={onPress}
      accessibilityLabel={`${name}, ${mapped ? "haptic mapped" : "no haptic mapped"}`}
      style={[chip.base, { borderColor: t.line, backgroundColor: t.panel }]}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          chip.wash,
          { backgroundColor: t.accent, opacity: Animated.multiply(flash, 0.25) },
        ]}
      />
      <View style={[chip.dot, { backgroundColor: mapped ? t.accent : t.line }]} />
      <Text style={[chip.text, { color: t.fg }]}>{name}</Text>
    </PressableScale>
  );
}

const chip = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    minHeight: 44,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  wash: { borderRadius: 20 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  text: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: Platform.select({ ios: "Menlo", default: "monospace" }),
  },
});
