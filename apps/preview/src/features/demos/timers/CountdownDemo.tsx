import { useRef, useState } from "react";
import { Text, View } from "react-native";
import Animated, { ZoomIn } from "react-native-reanimated";
import { Presets } from "react-native-pulsar";
import type { Theme } from "../../../theme/colors";
import { DemoButton } from "../shared/DemoButton";
import { DemoCard } from "../shared/DemoCard";
import { demoStyles } from "../shared/demoStyles";
import { useDemoHaptics } from "../shared/useDemoHaptics";
import { useTicker } from "../shared/useTicker";
import { COUNTDOWN_OPTIONS, tickKind } from "./countdown";

const FEEL = {
  soft: Presets.System.impactLight,
  strong: Presets.System.impactHeavy,
  done: Presets.finale,
};

interface ICountdownDemo {
  t: Theme;
}
export function CountdownDemo(props: ICountdownDemo) {
  const { t } = props;
  const s = demoStyles(t);
  const haptics = useDemoHaptics();
  const [seconds, setSeconds] = useState(5);
  const [remaining, setRemaining] = useState<number | null>(null);
  const left = useRef(0);
  const ticker = useTicker(() => setRemaining(null));
  const tick = () => {
    const kind = tickKind(left.current);
    FEEL[kind]();
    setRemaining(left.current);
    if (kind === "done") ticker.stop();
    left.current -= 1;
  };
  const start = () => {
    left.current = seconds;
    tick();
    ticker.start(1000, tick);
  };
  const cancel = () => {
    ticker.stop();
    haptics.stop();
    setRemaining(null);
  };
  return (
    <DemoCard t={t} title="Countdown">
      <Text style={s.body}>Soft ticks, harder for the last three, a finale at zero.</Text>
      <View style={s.row}>
        {COUNTDOWN_OPTIONS.map((n) => (
          <DemoButton
            key={n}
            t={t}
            label={`${n}s`}
            primary={n === seconds}
            disabled={ticker.running}
            onPress={() => setSeconds(n)}
          />
        ))}
      </View>
      <View style={s.stage}>
        <Animated.Text key={remaining ?? "idle"} entering={ZoomIn.duration(180)} style={s.mono}>
          {remaining === null ? seconds : remaining === 0 ? "Go" : remaining}
        </Animated.Text>
      </View>
      <View style={s.row}>
        <DemoButton t={t} primary label="Start" onPress={start} disabled={ticker.running} />
        <DemoButton t={t} label="Cancel" onPress={cancel} disabled={!ticker.running} />
      </View>
    </DemoCard>
  );
}
