import { useFonts } from "expo-font";
import { StyleSheet, View } from "react-native";
import { ThemedText } from "../../../components/ThemedText";
import type { Theme } from "../../../theme/colors";
import { NotificationPlayButton } from "./NotificationPlayButton";
import { NotificationToast } from "./NotificationToast";
import { useNotifications } from "./useNotifications";

interface INotificationDemo {
  t: Theme;
}
export function NotificationDemo(props: INotificationDemo) {
  const { t } = props;
  const [fontLoaded] = useFonts({ PulsarNotificationIcons: require("./notification-icons.ttf") });
  const { notification, playing, play } = useNotifications();
  return (
    <View>
      <ThemedText>
        Each notification type has its own unique haptic pattern that matches its intention.
      </ThemedText>
      <View style={styles.display}>
        {notification ? (
          <NotificationToast
            key={notification.id}
            notification={notification}
            t={t}
            fontLoaded={fontLoaded}
          />
        ) : null}
      </View>
      <View style={styles.button}>
        <NotificationPlayButton playing={playing} onPress={play} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  display: { marginTop: 40, minHeight: 80, justifyContent: "center" },
  button: { marginTop: 40 },
});
