import { Text, View } from "react-native";
import { Presets, type Pattern } from "react-native-pulsar";
import type { Theme } from "../../../theme/colors";
import { DemoButton } from "../shared/DemoButton";
import { DemoCard } from "../shared/DemoCard";
import { demoStyles } from "../shared/demoStyles";
import { useDemoHaptics } from "../shared/useDemoHaptics";
import { doubleTap, heartbeat, rampUp } from "./buttonPatterns";

const SYSTEM = [
  { label: "Light", play: Presets.System.impactLight },
  { label: "Medium", play: Presets.System.impactMedium },
  { label: "Heavy", play: Presets.System.impactHeavy },
  { label: "Selection", play: Presets.System.selection },
  { label: "Success", play: Presets.System.notificationSuccess },
  { label: "Warning", play: Presets.System.notificationWarning },
  { label: "Error", play: Presets.System.notificationError },
];
const PRESETS = [
  { label: "Hammer", play: Presets.hammer },
  { label: "Knock", play: Presets.knock },
  { label: "Coin drop", play: Presets.coinDrop },
  { label: "Typewriter", play: Presets.typewriter },
];
const CUSTOM: { label: string; pattern: () => Pattern }[] = [
  { label: "Double tap", pattern: doubleTap },
  { label: "Ramp up", pattern: rampUp },
  { label: "Heartbeat", pattern: heartbeat },
];

interface IButtonsDemo {
  t: Theme;
}
export function ButtonsDemo(props: IButtonsDemo) {
  const { t } = props;
  const s = demoStyles(t);
  const haptics = useDemoHaptics();
  const group = (title: string, items: { label: string; play: () => void }[]) => (
    <DemoCard t={t} title={title}>
      <View style={s.row}>
        {items.map((item) => (
          <DemoButton key={item.label} t={t} label={item.label} onPress={item.play} />
        ))}
      </View>
    </DemoCard>
  );
  return (
    <View style={{ gap: 16 }}>
      <Text style={s.body}>Tap any button to feel it.</Text>
      {group("System", SYSTEM)}
      {group("Pulsar presets", PRESETS)}
      {group(
        "Custom patterns",
        CUSTOM.map((item) => ({ label: item.label, play: () => haptics.play(item.pattern()) })),
      )}
    </View>
  );
}
