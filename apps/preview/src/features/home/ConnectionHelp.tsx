import { useState, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { BaseButton } from "react-native-gesture-handler";
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated";
import { ThemedText } from "../../components/ThemedText";
import { colors } from "../../theme/colors";
import { HomeChevron } from "./HomeChevron";

interface IConnectionStep {
  index: number;
  children: ReactNode;
}

function ConnectionStep(props: IConnectionStep) {
  const { index, children } = props;
  return (
    <View style={styles.step}>
      <View style={styles.stepRow}>
        <ThemedText style={styles.number}>{index}</ThemedText>
        <ThemedText>{children}</ThemedText>
      </View>
    </View>
  );
}

export function ConnectionHelp() {
  const [expanded, setExpanded] = useState(false);
  return (
    <View style={styles.container}>
      <BaseButton
        onPress={() => setExpanded((value) => !value)}
        rippleColor="rgba(0, 0, 0, 0)"
        style={styles.heading}
        accessibilityRole="button"
        accessibilityLabel="How to connect a device? 🤔"
        accessibilityState={{ expanded }}
      >
        <HomeChevron expanded={expanded} />
        <ThemedText>How to connect a device? 🤔</ThemedText>
      </BaseButton>
      {expanded && (
        <Animated.View entering={FadeInUp.delay(50)} exiting={FadeOutUp} style={styles.content}>
          <ConnectionStep index={1}>
            Open the Device panel in Buzzzz Studio and choose Connect device.
          </ConnectionStep>
          <ConnectionStep index={2}>
            Scan the QR code with this app, or type the pairing code above and tap Connect.
          </ConnectionStep>
          <ConnectionStep index={3}>
            Pick a preset on the website and feel the haptics right on your device.
          </ConnectionStep>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 20 },
  heading: { flexDirection: "row", alignItems: "center", gap: 6 },
  content: { marginTop: 6 },
  step: { marginTop: 10 },
  stepRow: { flexDirection: "row", alignItems: "flex-start", maxWidth: "88%" },
  number: {
    backgroundColor: colors.tag,
    textAlign: "center",
    paddingHorizontal: 11,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 10,
    fontSize: 18,
  },
});
