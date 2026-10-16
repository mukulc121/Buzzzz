import { useRef, useState } from "react";
import { Text, View } from "react-native";
import LottieView from "lottie-react-native";
import type { Theme } from "../../../theme/colors";
import { DemoButton } from "../shared/DemoButton";
import { DemoCard } from "../shared/DemoCard";
import { demoStyles } from "../shared/demoStyles";
import { useAppBackground } from "../shared/useAppBackground";
import { useDemoHaptics } from "../shared/useDemoHaptics";
import { BOUNCE, bouncePattern } from "./bounce";

interface ILottieDemo {
  t: Theme;
}
export function LottieDemo(props: ILottieDemo) {
  const { t } = props;
  const s = demoStyles(t);
  const view = useRef<LottieView>(null);
  const haptics = useDemoHaptics();
  const [playing, setPlaying] = useState(false);
  const stop = () => {
    view.current?.reset();
    haptics.stop();
    setPlaying(false);
  };
  useAppBackground(stop);
  const play = () => {
    view.current?.reset();
    view.current?.play();
    haptics.play(bouncePattern());
    setPlaying(true);
  };
  return (
    <DemoCard t={t} title="Bouncing ball">
      <Text style={s.body}>
        Each ground contact in the animation file is a tap, softer as the bounces get smaller.
      </Text>
      <View style={s.stage}>
        <LottieView
          ref={view}
          source={BOUNCE}
          autoPlay={false}
          loop={false}
          style={{ width: 200, height: 200 }}
          onAnimationFinish={() => setPlaying(false)}
        />
      </View>
      <View style={s.row}>
        <DemoButton t={t} primary label={playing ? "Replay" : "Play"} onPress={play} />
        <DemoButton t={t} label="Stop" onPress={stop} disabled={!playing} />
      </View>
    </DemoCard>
  );
}
