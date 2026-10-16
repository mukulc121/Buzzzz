import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform, StyleSheet, TouchableOpacity } from "react-native";
import { Settings } from "react-native-pulsar";
import { Card } from "../../components/Card";
import { Icon } from "../../components/Icon";
import { ThemedText } from "../../components/ThemedText";
import { colors } from "../../theme/colors";
import { deriveHapticsSupport } from "./model";

const dismissedKey = "hapticsSupportBannerDismissed";

export function HapticsSupportBanner() {
  const [level, setLevel] = useState<number | null>(null);
  useEffect(() => {
    if (Platform.OS !== "android") return;
    let active = true;
    void AsyncStorage.getItem(dismissedKey).then(
      (dismissed) => {
        if (active && !dismissed) setLevel(Settings.getHapticsSupportLevel());
      },
      () => {},
    );
    return () => {
      active = false;
    };
  }, []);
  if (level === null) return null;
  const { name, description } = deriveHapticsSupport(level);
  return (
    <Card style={styles.card}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Dismiss haptic support"
        onPress={() => {
          setLevel(null);
          void AsyncStorage.setItem(dismissedKey, "true").catch(() => {});
        }}
        style={styles.close}
      >
        <Icon name="x" size={34} color={colors.navy} />
      </TouchableOpacity>
      <ThemedText type="subtitle">Haptic support: {name}</ThemedText>
      <ThemedText style={styles.description}>{description}</ThemedText>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 20 },
  description: { marginTop: 10 },
  close: { position: "absolute", top: 8, right: 8, zIndex: 1 },
});
