import { useRef, useState } from "react";
import { StyleSheet, Text, View, type GestureResponderEvent } from "react-native";
import type { Theme } from "../../../theme/colors";
import { DemoCard } from "../shared/DemoCard";
import { demoColors, demoStyles } from "../shared/demoStyles";
import { SupportNote } from "../shared/SupportNote";
import { useDemoHaptics } from "../shared/useDemoHaptics";
import { STEPS, stepFeel, stepOf, valueAt } from "./slider";

const THUMB = 28;

interface ISliderDemo {
  t: Theme;
}
export function SliderDemo(props: ISliderDemo) {
  const { t } = props;
  const s = demoStyles(t);
  const haptics = useDemoHaptics();
  const width = useRef(0);
  const [step, setStep] = useState(STEPS / 2);
  const last = useRef(step);
  const moveTo = (next: number) => {
    const clamped = Math.max(0, Math.min(STEPS, next));
    if (clamped === last.current) return;
    last.current = clamped;
    const feel = stepFeel(clamped);
    haptics.realtime.playDiscrete(feel.amplitude, feel.frequency);
    setStep(clamped);
  };
  const track = (event: GestureResponderEvent) =>
    moveTo(stepOf(valueAt(event.nativeEvent.locationX, width.current)));
  const percent = `${(step / STEPS) * 100}%` as const;
  return (
    <DemoCard t={t} title="Stepped slider">
      <Text style={s.body}>Drag the thumb. Every step clicks, firmer toward the right.</Text>
      <SupportNote t={t} />
      <View
        style={styles.hit}
        onLayout={(e) => (width.current = e.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={track}
        onResponderMove={track}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Haptic strength"
        accessibilityValue={{ min: 0, max: STEPS, now: step }}
        accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
        onAccessibilityAction={(e) =>
          moveTo(step + (e.nativeEvent.actionName === "increment" ? 1 : -1))
        }
      >
        <View
          pointerEvents="none"
          style={[styles.rail, { backgroundColor: t.sunken, borderColor: t.line }]}
        >
          <View style={[styles.fill, { width: percent }]} />
        </View>
        <View
          pointerEvents="none"
          style={[styles.thumb, { left: percent, backgroundColor: t.panel }]}
        />
      </View>
      <Text style={s.muted}>
        Step {step} of {STEPS}
      </Text>
    </DemoCard>
  );
}

const styles = StyleSheet.create({
  hit: { height: 56, justifyContent: "center", marginHorizontal: THUMB / 2 },
  rail: { height: 10, borderRadius: 4, borderWidth: 1, overflow: "hidden" },
  fill: { height: "100%", backgroundColor: demoColors.cyan },
  thumb: {
    position: "absolute",
    width: THUMB,
    height: THUMB,
    marginLeft: -THUMB / 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: demoColors.cyan,
    boxShadow: `-2px 2px 0 ${demoColors.cyan}`,
  },
});
