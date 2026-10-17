import { StyleSheet, View } from "react-native";
import { usePatternComposer } from "react-native-pulsar";
import { ThemedText } from "../../../components/ThemedText";
import type { Theme } from "../../../theme/colors";
import { useAppBackground } from "../shared/useAppBackground";
import { HapticSlider } from "./HapticSlider";
import { SLIDER_PRESETS } from "./sliderModel";

interface ISliderCard {
  t: Theme;
  preset: (typeof SLIDER_PRESETS)[number];
}
export function SliderCard(props: ISliderCard) {
  const { t, preset } = props;
  const composer = usePatternComposer(preset.pattern);
  useAppBackground(composer.stop);
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: t.panel,
          borderColor: t.highlight,
          boxShadow: `-3px 3px 0px ${t.highlight}`,
        },
      ]}
    >
      <ThemedText type="subtitle" style={styles.title}>
        {preset.title}
      </ThemedText>
      <HapticSlider label={preset.title} play={composer.play} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { paddingVertical: 16, paddingHorizontal: 12, borderRadius: 4, borderWidth: 2 },
  title: { marginBottom: 8 },
});
