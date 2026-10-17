import { StyleSheet, View } from "react-native";
import Animated, { FadeInUp, FadeOutDown } from "react-native-reanimated";
import { ThemedText } from "../../../components/ThemedText";
import { colors } from "../../../theme/colors";
import { HapticDemoButton } from "../controls/HapticDemoButton";
import { useCountdown } from "./useCountdown";

export function CountdownDemo() {
  const { state, start, reset } = useCountdown();
  const remaining = state.kind === "running" ? state.remaining : null;
  return (
    <View>
      <ThemedText>Experience haptic feedback synced to a countdown timer.</ThemedText>
      <View style={styles.timerContainer}>
        <Animated.View key={remaining} entering={FadeInUp} exiting={FadeOutDown}>
          <ThemedText
            type="title"
            style={[styles.timerText, remaining !== null && remaining <= 3 && styles.warning]}
          >
            {remaining ?? "..."}
          </ThemedText>
        </Animated.View>
        <ThemedText style={styles.statusText}>
          {remaining === null ? "Ready to start" : `${remaining} seconds left`}
        </ThemedText>
      </View>
      <View style={styles.controls}>
        <HapticDemoButton
          label={remaining === null ? "Start Countdown" : "Reset"}
          onPress={remaining === null ? start : reset}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  timerContainer: {
    marginTop: 40,
    alignItems: "center",
    paddingVertical: 30,
    backgroundColor: colors.white,
    borderRadius: 16,
  },
  timerText: { fontSize: 72, fontWeight: "bold", lineHeight: 80 },
  warning: { color: "rgba(255, 59, 48, 1)" },
  statusText: { marginTop: 12, fontSize: 14, opacity: 0.7 },
  controls: { marginTop: 30, gap: 12 },
});
