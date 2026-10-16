import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { Accelerometer } from "expo-sensors";
import type { Theme } from "../../../theme/colors";
import { DemoButton } from "../shared/DemoButton";
import { DemoCard } from "../shared/DemoCard";
import { demoColors, demoStyles } from "../shared/demoStyles";
import { SupportNote } from "../shared/SupportNote";
import { useAppBackground } from "../shared/useAppBackground";
import { useDemoHaptics } from "../shared/useDemoHaptics";
import { tiltFeel } from "./tilt";

type Sub = ReturnType<typeof Accelerometer.addListener>;
const RANGE = 70;

interface IAccelerometerDemo {
  t: Theme;
}
export function AccelerometerDemo(props: IAccelerometerDemo) {
  const { t } = props;
  const s = demoStyles(t);
  const haptics = useDemoHaptics();
  const sub = useRef<Sub | null>(null);
  const [state, setState] = useState<"idle" | "running" | "unavailable">("idle");
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const bubble = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value * RANGE }, { translateY: -y.value * RANGE }],
  }));
  const stop = () => {
    sub.current?.remove();
    sub.current = null;
    haptics.realtime.stop();
    setState((prev) => (prev === "running" ? "idle" : prev));
  };
  useAppBackground(stop);
  useEffect(() => () => sub.current?.remove(), []);
  const start = async () => {
    if (!(await Accelerometer.isAvailableAsync())) {
      setState("unavailable");
      return;
    }
    stop();
    Accelerometer.setUpdateInterval(50);
    sub.current = Accelerometer.addListener((reading) => {
      x.set(Math.max(-1, Math.min(1, reading.x)));
      y.set(Math.max(-1, Math.min(1, reading.y)));
      const feel = tiltFeel(reading);
      if (feel.amplitude) haptics.realtime.set(feel.amplitude, feel.frequency);
      else haptics.realtime.stop();
    });
    setState("running");
  };
  return (
    <DemoCard t={t} title="Tilt and shake">
      <Text style={s.body}>
        Tilt the phone to move the bubble. Tilting raises the pitch, shaking makes it stronger.
      </Text>
      <SupportNote t={t} />
      <View style={s.stage}>
        <View style={[styles.well, { borderColor: t.line, backgroundColor: t.sunken }]}>
          <Animated.View style={[styles.bubble, bubble]} />
        </View>
      </View>
      {state === "unavailable" ? (
        <Text style={[s.muted, { color: t.err }]}>No accelerometer on this device.</Text>
      ) : null}
      <View style={s.row}>
        <DemoButton t={t} primary label="Start" onPress={start} disabled={state === "running"} />
        <DemoButton t={t} label="Stop" onPress={stop} disabled={state !== "running"} />
      </View>
    </DemoCard>
  );
}

const styles = StyleSheet.create({
  well: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  bubble: { width: 36, height: 36, borderRadius: 18, backgroundColor: demoColors.cyan },
});
