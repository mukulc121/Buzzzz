import { useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { Presets } from "react-native-pulsar";
import type { Theme } from "../../../theme/colors";
import { DemoButton } from "../shared/DemoButton";
import { DemoCard } from "../shared/DemoCard";
import { demoStyles } from "../shared/demoStyles";
import { SupportNote } from "../shared/SupportNote";
import { useDemoHaptics } from "../shared/useDemoHaptics";
import { useTicker } from "../shared/useTicker";
import { BalloonArt } from "./BalloonArt";
import { balloonScale, deflate, inflate, isPopped, stretchFeel } from "./balloon";

const FRAME_MS = 40;

interface IBalloonDemo {
  t: Theme;
}
export function BalloonDemo(props: IBalloonDemo) {
  const { t } = props;
  const s = demoStyles(t);
  const haptics = useDemoHaptics();
  const level = useRef(0);
  const holding = useRef(false);
  const [popped, setPopped] = useState(false);
  const scale = useSharedValue(balloonScale(0));
  const grow = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const reset = () => {
    level.current = 0;
    holding.current = false;
    scale.set(balloonScale(0));
    setPopped(false);
  };
  const ticker = useTicker(() => {
    haptics.realtime.stop();
    if (!popped) reset();
  });
  const frame = () => {
    level.current = (holding.current ? inflate : deflate)(level.current, FRAME_MS);
    scale.set(withTiming(balloonScale(level.current), { duration: FRAME_MS }));
    if (isPopped(level.current)) {
      ticker.stop();
      haptics.realtime.stop();
      Presets.balloonPop();
      setPopped(true);
    } else if (holding.current) {
      const feel = stretchFeel(level.current);
      haptics.realtime.set(feel.amplitude, feel.frequency);
    } else if (level.current === 0) ticker.stop();
  };
  const pressIn = () => {
    if (popped) return;
    holding.current = true;
    if (!ticker.running) ticker.start(FRAME_MS, frame);
  };
  const pressOut = () => {
    holding.current = false;
    haptics.realtime.stop();
  };
  return (
    <DemoCard t={t} title="Balloon">
      <Text style={s.body}>
        Press and hold to inflate. Let go to let air out, hold on to pop it.
      </Text>
      <SupportNote t={t} />
      <Pressable
        style={[s.stage, { height: 270 }]}
        onPressIn={pressIn}
        onPressOut={pressOut}
        accessibilityRole="button"
        accessibilityLabel={popped ? "Popped balloon" : "Hold to inflate the balloon"}
      >
        <Animated.View style={popped ? null : grow}>
          <BalloonArt popped={popped} string={t.fg2} />
        </Animated.View>
      </Pressable>
      <View style={s.row}>
        <DemoButton t={t} label="New balloon" onPress={reset} disabled={!popped} />
      </View>
    </DemoCard>
  );
}
