import { StyleSheet } from "react-native";
import Animated, { useAnimatedStyle, type SharedValue } from "react-native-reanimated";
import { SLIDER_THUMB_SIZE } from "./sliderModel";

interface ISliderTick {
  index: number;
  width: SharedValue<number>;
  value: SharedValue<number>;
}
export function SliderTick(props: ISliderTick) {
  const { index, width, value } = props;
  const color = useAnimatedStyle(() => ({
    backgroundColor:
      (index / 10) * width.get() <=
      SLIDER_THUMB_SIZE / 2 + (value.get() / 100) * (width.get() - SLIDER_THUMB_SIZE)
        ? "rgba(255, 255, 255, 0.8)"
        : "rgba(255, 255, 255, 0.3)",
  }));
  return <Animated.View style={[styles.tick, color]} />;
}

const styles = StyleSheet.create({
  tick: { width: 2, height: 10, borderRadius: 1 },
});
