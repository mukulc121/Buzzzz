import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";
import { Presets } from "react-native-pulsar";
import { ThemedText } from "../../../components/ThemedText";
import type { Theme } from "../../../theme/colors";
import type { Notification } from "./notifications";

interface INotificationToast {
  t: Theme;
  notification: Notification;
  fontLoaded: boolean;
}
export function NotificationToast(props: INotificationToast) {
  const { t, notification, fontLoaded } = props;
  useEffect(() => {
    Presets[notification.preset]();
  }, [notification]);
  return (
    <Animated.View
      entering={FadeInDown.springify()}
      exiting={FadeOutDown.springify()}
      style={[
        styles.card,
        {
          backgroundColor: t.panel,
          borderColor: t.highlight,
          boxShadow: `-3px 3px 0px ${t.highlight}`,
        },
      ]}
    >
      <View style={[styles.badge, { backgroundColor: notification.color }]}>
        {fontLoaded ? (
          <Text style={styles.icon}>{String.fromCodePoint(notification.glyph)}</Text>
        ) : null}
      </View>
      <View style={styles.content}>
        <ThemedText type="defaultSemiBold">{notification.title}</ThemedText>
        <ThemedText style={styles.message}>{notification.message}</ThemedText>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 2,
    borderRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  badge: { width: 48, height: 48, borderRadius: 4, alignItems: "center", justifyContent: "center" },
  icon: {
    fontFamily: "PulsarNotificationIcons",
    fontSize: 28,
    fontWeight: "normal",
    fontStyle: "normal",
    color: "rgba(255, 255, 255, 1)",
  },
  content: { flex: 1, gap: 2 },
  message: { fontSize: 14 },
});
