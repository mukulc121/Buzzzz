import { useRef, useState } from "react";
import { Text, View } from "react-native";
import type { Theme } from "../../../theme/colors";
import { DemoButton } from "../shared/DemoButton";
import { DemoCard } from "../shared/DemoCard";
import { demoStyles } from "../shared/demoStyles";
import { useDemoHaptics } from "../shared/useDemoHaptics";
import { useTicker } from "../shared/useTicker";
import { Dot } from "./Dot";
import { DOT_COUNT, DOT_MS, dotFeel, nextDot } from "./dots";

const DOTS = Array.from({ length: DOT_COUNT }, (_, i) => i);

interface IDotLoaderDemo {
  t: Theme;
}
export function DotLoaderDemo(props: IDotLoaderDemo) {
  const { t } = props;
  const s = demoStyles(t);
  const haptics = useDemoHaptics();
  const [active, setActive] = useState<number | null>(null);
  const index = useRef(0);
  const ticker = useTicker(() => setActive(null));
  const step = () => {
    const feel = dotFeel(index.current);
    haptics.realtime.playDiscrete(feel.amplitude, feel.frequency);
    setActive(index.current);
    index.current = nextDot(index.current);
  };
  const play = () => {
    index.current = 0;
    step();
    ticker.start(DOT_MS, step);
  };
  const stop = () => {
    ticker.stop();
    haptics.stop();
    setActive(null);
  };
  return (
    <DemoCard t={t} title="Dot loader">
      <Text style={s.body}>A looping loader where every dot you see also lands as a tap.</Text>
      <View style={[s.stage, { flexDirection: "row", gap: 18 }]}>
        {DOTS.map((i) => (
          <Dot key={i} active={i === active} />
        ))}
      </View>
      <View style={s.row}>
        <DemoButton t={t} primary label="Play" onPress={play} disabled={ticker.running} />
        <DemoButton t={t} label="Stop" onPress={stop} disabled={!ticker.running} />
      </View>
    </DemoCard>
  );
}
