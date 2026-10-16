import { StyleSheet, View } from "react-native";
import { VirtualGestureDetector } from "react-native-gesture-handler";
import Animated from "react-native-reanimated";
import type { Theme } from "../../../theme/colors";
import type { BalloonProfile } from "./balloon";
import { useBalloonCell } from "./useBalloonCell";

interface IBalloonCell {
  t: Theme;
  index: number;
  profile: BalloonProfile;
}
export function BalloonCell(props: IBalloonCell) {
  const { t, index, profile } = props;
  const { gesture, balloonStyle, poppedStyle } = useBalloonCell(profile);
  return (
    <VirtualGestureDetector gesture={gesture}>
      <View
        style={styles.cell}
        accessibilityRole="button"
        accessibilityLabel={`Balloon ${index + 1}`}
      >
        <View style={styles.slot}>
          <Animated.View style={[styles.dot, { backgroundColor: t.fg }, balloonStyle]} />
          <Animated.View style={[styles.popped, { borderColor: t.highlight }, poppedStyle]} />
        </View>
      </View>
    </VirtualGestureDetector>
  );
}

const styles = StyleSheet.create({
  cell: { width: "48%", alignItems: "center", justifyContent: "center", paddingVertical: 16 },
  slot: {
    width: 110,
    height: 110,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  dot: { position: "absolute", width: 80, height: 80, borderRadius: 40 },
  popped: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderStyle: "dotted",
    opacity: 0,
  },
});
