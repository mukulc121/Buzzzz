import { useEffect } from "react";
import { useRouter } from "expo-router";
import { Image, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Settings } from "react-native-pulsar";
import { Card } from "../../components/Card";
import { ThemedText } from "../../components/ThemedText";
import { usePreview } from "../shell/usePreview";
import { ConnectionPanel } from "../connection/ConnectionPanel";
import { ConnectionCard } from "./ConnectionCard";

export function HomeScreen() {
  const { t, session } = usePreview();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  useEffect(() => {
    Settings.enableSound(true);
  }, []);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={["top", "left", "right"]}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingHorizontal: 15, paddingBottom: insets.bottom + 12 }}
      >
        <View style={styles.title}>
          <ThemedText type="title">Welcome to Buzzzz!</ThemedText>
          <Image source={require("../../../assets/icon.png")} style={styles.logo} />
        </View>
        <ThemedText type="subtitle">Your connections</ThemedText>
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
            />
          ))
        ) : (
          <Card style={{ marginTop: 10 }}>
            <ThemedText>No connections yet.</ThemedText>
          </Card>
        )}
        <View style={{ marginTop: 20 }}>
          <ConnectionPanel relay={session.relay} t={t} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  title: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 30,
    marginBottom: 30,
  },
  logo: { width: 50, height: 50, marginTop: -10 },
});
