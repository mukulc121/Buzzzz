import { StyleSheet, View } from "react-native";
import { InterceptingGestureDetector } from "react-native-gesture-handler";
import { ThemedText } from "../../../components/ThemedText";
import type { Theme } from "../../../theme/colors";
import { SliderCard } from "./SliderCard";
import { SLIDER_PRESETS } from "./sliderModel";

interface ISliderDemo {
  t: Theme;
}
export function SliderDemo(props: ISliderDemo) {
  const { t } = props;
  return (
    <View>
      <ThemedText>
        Move each slider to feel different haptic characteristics. Each slider plays a unique haptic
        feedback when crossing ticks.
      </ThemedText>
      <InterceptingGestureDetector>
        <View style={styles.sliders}>
          {SLIDER_PRESETS.map((preset) => (
            <SliderCard key={preset.title} t={t} preset={preset} />
          ))}
        </View>
      </InterceptingGestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  sliders: { marginTop: 24, gap: 24 },
});
