import { StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { ThemedText } from "../../../components/ThemedText";
import type { Theme } from "../../../theme/colors";
import { useSensorDemo } from "./useSensorDemo";

interface IAccelerometerDemo {
  t: Theme;
}
export function AccelerometerDemo(props: IAccelerometerDemo) {
  const { t } = props;
  const state = useSensorDemo();
  const dot = useAnimatedStyle(() => ({
    transform: [{ translateX: state.get().dotX }, { translateY: state.get().dotY }],
  }));
  return (
    <View>
      <ThemedText>
        Tilt your device to move the dot inside the circle. Feel different haptics as the dot moves.
      </ThemedText>
      <View style={styles.stage}>
        <View style={[styles.circle, { backgroundColor: t.panel, borderColor: t.fg }]}>
          <Animated.View style={[styles.dot, { backgroundColor: t.fg }, dot]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { marginTop: 40, marginBottom: 40, alignItems: "center", justifyContent: "center" },
  circle: {
    width: 300,
    height: 300,
    borderRadius: 150,
    borderWidth: 2,
    position: "relative",
  },
  dot: { position: "absolute", width: 30, height: 30, borderRadius: 15 },
});
