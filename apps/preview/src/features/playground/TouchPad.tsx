import { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import Animated from "react-native-reanimated";
import { GestureDetector } from "react-native-gesture-handler";
import { PlaygroundGrid } from "./PlaygroundGrid";
import { PlaygroundTutorial } from "./PlaygroundTutorial";
import { usePlaygroundPreferences } from "./usePlaygroundPreferences";
import { usePlaygroundGesture } from "./usePlaygroundGesture";
import { playgroundStyles as styles } from "./playgroundStyles";
import type { IPlaygroundEvent } from "./recording";

interface ITouchPad {
  recordEvent: (type: IPlaygroundEvent["type"], x: number, y: number) => void;
}

export function TouchPad(props: ITouchPad) {
  const { onboarding, setOnboarding } = usePlaygroundPreferences();
  const size = useSharedValue({ width: 0, height: 0 });
  const tapPosition = useSharedValue({ x: -100, y: -100 });
  const panPosition = useSharedValue({ x: -100, y: -100 });
  const tapStyle = useAnimatedStyle(() => ({
    left: tapPosition.get().x - 15,
    top: tapPosition.get().y - 15,
  }));
  const panStyle = useAnimatedStyle(() => ({
    left: panPosition.get().x - 15,
    top: panPosition.get().y - 15,
  }));
  const gesture = usePlaygroundGesture({
    size,
    tapPosition,
    panPosition,
    tutorial: onboarding !== 3,
    recordEvent: props.recordEvent,
    onOnboarding: (step) => {
      if (step > onboarding) void setOnboarding(step).catch(() => {});
    },
  });
  return (
    <PlaygroundTutorial step={onboarding}>
      <GestureDetector gesture={gesture}>
        <Animated.View
          testID="playground-grid"
          accessibilityLabel="Haptic touch playground"
          style={styles.gridContainer}
          onLayout={(event) => {
            const { width, height } = event.nativeEvent.layout;
            size.set({ width, height });
          }}
        >
          <Animated.View
            pointerEvents="none"
            style={[styles.indicator, styles.tapIndicator, tapStyle]}
          />
          <Animated.View
            pointerEvents="none"
            style={[styles.indicator, styles.panIndicator, panStyle]}
          />
          <PlaygroundGrid />
        </Animated.View>
      </GestureDetector>
    </PlaygroundTutorial>
  );
}
