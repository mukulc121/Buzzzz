import { StyleSheet, View } from "react-native";
import {
  VirtualGestureDetector,
  useExclusiveGestures,
  usePanGesture,
  useTapGesture,
} from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { SliderTick } from "./SliderTick";
import { crossedSliderTick, SLIDER_THUMB_SIZE, sliderPosition, sliderValue } from "./sliderModel";

const TICKS = Array.from({ length: 11 }, (_, index) => index);

interface IHapticSlider {
  label: string;
  play: () => void;
}
export function HapticSlider(props: IHapticSlider) {
  const { label, play } = props;
  const width = useSharedValue(0);
  const value = useSharedValue(50);
  const position = useSharedValue(0);
  const dragOffset = useSharedValue(0);
  const updateValue = (next: number) => {
    "worklet";
    if (crossedSliderTick(value.get(), next)) play();
    value.set(next);
  };
  const pan = usePanGesture({
    onActivate: (event) => {
      dragOffset.set(position.get() - (event.x - 5));
    },
    onUpdate: (event) => {
      const next = sliderPosition(event.x - 5 + dragOffset.get(), width.get());
      position.set(next);
      updateValue(sliderValue(next, width.get()));
    },
  });
  const tap = useTapGesture({
    onActivate: (event) => {
      const next = sliderPosition(event.x - 5, width.get());
      position.set(withSpring(next, { damping: 8, mass: 1, overshootClamping: true }));
      updateValue(sliderValue(next, width.get()));
    },
  });
  const gesture = useExclusiveGestures(pan, tap);
  const thumb = useAnimatedStyle(() => ({
    transform: [{ translateX: position.get() - SLIDER_THUMB_SIZE / 2 }],
  }));
  const fill = useAnimatedStyle(() => ({
    width: SLIDER_THUMB_SIZE / 2 + (value.get() / 100) * (width.get() - SLIDER_THUMB_SIZE),
  }));
  const ticks = useAnimatedStyle(() => ({ width: width.get() }));
  return (
    <VirtualGestureDetector gesture={gesture}>
      <View
        style={styles.container}
        testID={`slider-${label}`}
        onLayout={(event) => {
          const nextWidth = event.nativeEvent.layout.width - 10;
          width.set(nextWidth);
          position.set(
            SLIDER_THUMB_SIZE / 2 + (value.get() / 100) * (nextWidth - SLIDER_THUMB_SIZE),
          );
        }}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
        onAccessibilityAction={(event) => {
          const delta = event.nativeEvent.actionName === "increment" ? 1 : -1;
          const next = Math.max(0, Math.min(100, value.get() + delta));
          updateValue(next);
          position.set(SLIDER_THUMB_SIZE / 2 + (next / 100) * (width.get() - SLIDER_THUMB_SIZE));
        }}
      >
        <View style={styles.track}>
          <Animated.View style={[styles.fill, fill]} />
        </View>
        <Animated.View pointerEvents="none" style={[styles.ticks, ticks]}>
          {TICKS.map((index) => (
            <SliderTick key={index} index={index} width={width} value={value} />
          ))}
        </Animated.View>
        <Animated.View pointerEvents="none" style={[styles.thumb, thumb]} />
      </View>
    </VirtualGestureDetector>
  );
}

const styles = StyleSheet.create({
  container: { height: 40, justifyContent: "center", paddingHorizontal: 5 },
  track: {
    height: 6,
    backgroundColor: "rgba(224, 240, 250, 1)",
    borderRadius: 3,
    overflow: "hidden",
  },
  fill: { height: 6, backgroundColor: "rgba(100, 200, 255, 0.8)", borderRadius: 3 },
  ticks: {
    position: "absolute",
    left: 5,
    height: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 0,
  },
  thumb: {
    position: "absolute",
    left: 5,
    width: SLIDER_THUMB_SIZE,
    height: SLIDER_THUMB_SIZE,
    borderRadius: SLIDER_THUMB_SIZE / 2,
    backgroundColor: "rgba(224, 240, 250, 1)",
    borderWidth: 2,
    borderColor: "rgba(100, 200, 255, 1)",
  },
});
