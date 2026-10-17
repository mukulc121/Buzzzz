import { StyleSheet, View } from "react-native";
import { usePatternComposer } from "react-native-pulsar";
import { ThemedText } from "../../../components/ThemedText";
import { HapticDemoButton } from "./HapticDemoButton";
import { BUTTON_PATTERNS } from "./buttonPatterns";

interface IButtonCell {
  entry: (typeof BUTTON_PATTERNS)[number];
}
function ButtonCell(props: IButtonCell) {
  const { entry } = props;
  const composer = usePatternComposer(entry.pattern);
  return <HapticDemoButton label={entry.label} onPress={composer.play} style={styles.button} />;
}

export function ButtonsDemo() {
  return (
    <View>
      <ThemedText>Tap each button to feel a different haptic pattern.</ThemedText>
      <View style={styles.grid}>
        {BUTTON_PATTERNS.map((entry) => (
          <ButtonCell key={entry.label} entry={entry} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    marginTop: 22,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 20,
  },
  button: { width: "48%" },
});
