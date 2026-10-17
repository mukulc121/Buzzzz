import { useRouter } from "expo-router";
import { useBottomTabBarHeight } from "expo-router/js-tabs";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card } from "../../components/Card";
import { BuzzzzMark } from "../../components/BuzzzzMark";
import { TAB_CONTENT_INSET, TabHeader } from "../../components/TabHeader";
import { ThemedText } from "../../components/ThemedText";
import { usePreview } from "../shell/usePreview";
import { AddConnectionCard } from "./AddConnectionCard";
import { ConnectionCard } from "./ConnectionCard";
import { HapticsSupportBanner } from "./HapticsSupportBanner";

export function HomeScreen() {
  const { t, session } = usePreview();
  const router = useRouter();
  const tabBarHeight = useBottomTabBarHeight();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={["top", "left", "right"]}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingBottom: tabBarHeight + 12 }}
      >
        <View style={styles.content}>
          <TabHeader title="Welcome to Buzzzz!" trailing={<BuzzzzMark />}>
            <ThemedText type="subtitle">Your connections</ThemedText>
          </TabHeader>
          {session.relay.connections.length ? (
            session.relay.connections.map((connection) => (
              <ConnectionCard
                key={connection.id}
                connection={connection}
                onOpen={() =>
                  router.push({
                    pathname: "/mediaLibraryModal",
                    params: { connectionId: connection.id },
                  })
                }
                onReconnect={() => session.relay.reconnect(connection.id)}
                onRemove={() => session.disconnect(connection.id)}
                onEdit={() =>
                  router.push({
                    pathname: "/editConnectionModal",
                    params: { connectionId: connection.id },
                  })
                }
              />
            ))
          ) : (
            <Card style={{ marginTop: 10 }}>
              <ThemedText>No connections yet.</ThemedText>
            </Card>
          )}
          <AddConnectionCard relay={session.relay} t={t} />
          <HapticsSupportBanner />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: TAB_CONTENT_INSET },
});
