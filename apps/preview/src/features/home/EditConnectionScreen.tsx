import { useEffect, useRef, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { Icon } from "../../components/Icon";
import { ThemedText } from "../../components/ThemedText";
import { colors } from "../../theme/colors";
import { connectionDisplayName, type RelayStatus } from "../connection/model";
import { usePreview } from "../shell/usePreview";
import { ConnectionNameInput } from "./ConnectionNameInput";

function statusLabel(status: RelayStatus): string {
  switch (status) {
    case "connected":
      return "Connected";
    case "connecting":
      return "Connecting…";
    case "idle":
      return "Offline";
    case "error":
      return "Couldn’t connect";
  }
}

interface IDetailRow {
  label: string;
  value: string;
}

function DetailRow(props: IDetailRow) {
  const { label, value } = props;
  return (
    <View style={styles.detailRow}>
      <ThemedText style={styles.detailLabel}>{label}</ThemedText>
      <ThemedText type="defaultSemiBold" style={styles.detailValue} numberOfLines={1}>
        {value}
      </ThemedText>
    </View>
  );
}

export function EditConnectionScreen() {
  const params = useLocalSearchParams<{ connectionId?: string | string[] }>();
  const connectionId = typeof params.connectionId === "string" ? params.connectionId : "";
  const { session } = usePreview();
  const connection = session.relay.connections.find((record) => record.id === connectionId);
  const [name, setName] = useState(() => (connection ? connectionDisplayName(connection) : ""));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);
  const pending = useRef(false);
  const router = useRouter();
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const save = async () => {
    if (pending.current) return;
    pending.current = true;
    setSaving(true);
    setError(null);
    try {
      if (connection) await session.relay.rename(connection.id, name);
      if (mounted.current) router.back();
    } catch (cause) {
      if (mounted.current)
        setError(
          cause instanceof Error ? cause.message : "The connection name could not be saved.",
        );
    } finally {
      pending.current = false;
      if (mounted.current) setSaving(false);
    }
  };
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <ThemedText type="subtitle">Connection</ThemedText>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.closeButton}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Icon name="x" size={28} color={colors.navy} />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {!connection ? (
          <Card style={{ marginTop: 10 }}>
            <ThemedText>This connection is no longer available.</ThemedText>
          </Card>
        ) : (
          <>
            <Card>
              <ThemedText type="defaultSemiBold">Name</ThemedText>
              <ThemedText style={[styles.help, { marginTop: 10 }]}>
                Choose a label for this connection. Leave blank to use the default name.
              </ThemedText>
              <ConnectionNameInput
                value={name}
                onChangeText={setName}
                onSubmit={() => {
                  void save();
                }}
              />
              <Button
                label="Save"
                style={{ marginTop: 15 }}
                enabled={!saving}
                onClick={() => {
                  void save();
                }}
              />
              {error && (
                <ThemedText accessibilityRole="alert" style={{ marginTop: 10, color: colors.red }}>
                  {error}
                </ThemedText>
              )}
            </Card>
            <Card style={{ marginTop: 20 }}>
              <ThemedText type="defaultSemiBold">Details</ThemedText>
              <View style={{ marginTop: 10 }}>
                <DetailRow label="Type" value="Browser" />
                <DetailRow label="Status" value={statusLabel(connection.status)} />
                <DetailRow
                  label="Created"
                  value={
                    connection.createdAt === undefined
                      ? "—"
                      : new Date(connection.createdAt).toLocaleString()
                  }
                />
                <DetailRow label="Live preview" value="Not available" />
              </View>
            </Card>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.white },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderBottomWidth: 2,
    borderBottomColor: colors.tag,
  },
  closeButton: { paddingVertical: 8, paddingLeft: 12 },
  scrollContent: { padding: 15, paddingBottom: 40 },
  help: { fontSize: 14, color: colors.muted },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(234, 238, 245, 1)",
  },
  detailLabel: { fontSize: 14, color: colors.muted, marginRight: 12 },
  detailValue: { flexShrink: 1, textAlign: "right" },
});
