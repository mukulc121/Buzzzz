import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { Icon } from "../../components/Icon";
import { ThemedText } from "../../components/ThemedText";
import { colors, type Theme } from "../../theme/colors";
import type { usePhoneRelay } from "../connection/usePhoneRelay";
import { QrScanner } from "../connection/QrScanner";
import { ConnectionInput } from "./ConnectionInput";
import { ConnectionHelp } from "./ConnectionHelp";

interface IAddConnectionCard {
  relay: ReturnType<typeof usePhoneRelay>;
  t: Theme;
}

export function AddConnectionCard(props: IAddConnectionCard) {
  const { relay, t } = props;
  const [scanner, setScanner] = useState(false);
  const submit = () => {
    const value = relay.input.trim();
    if (!value) return;
    relay.connect(value);
    relay.setInput("");
  };
  return (
    <Card style={styles.card}>
      <ThemedText type="subtitle">Add a new connection</ThemedText>
      <ThemedText style={styles.description}>
        Scan a pairing QR code or enter a connecting code below to add another producer.
      </ThemedText>
      <TouchableOpacity
        onPress={() => setScanner(true)}
        activeOpacity={0.8}
        style={styles.scanButton}
        accessibilityRole="button"
        accessibilityLabel="Scan QR code"
      >
        <Icon name="qr-code" size={20} color={colors.navy} />
        <Text style={styles.scanText}>Scan QR code</Text>
      </TouchableOpacity>
      <View style={styles.orRow}>
        <View style={styles.orLine} />
        <Text style={styles.orText}>or enter a code</Text>
        <View style={styles.orLine} />
      </View>
      <View style={styles.connectRow}>
        <ConnectionInput value={relay.input} onChangeText={relay.setInput} onSubmit={submit} />
        <Button label="Connect" style={styles.connectButton} onClick={submit} />
      </View>
      {relay.error && (
        <ThemedText accessibilityRole="alert" style={styles.error}>
          {relay.error}
        </ThemedText>
      )}
      <ConnectionHelp />
      {scanner && (
        <QrScanner onClose={() => setScanner(false)} onConnect={relay.requestConnection} t={t} />
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 20 },
  description: { marginTop: 10 },
  scanButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.white,
    borderRadius: 4,
    paddingVertical: 16,
    borderColor: colors.border,
    borderWidth: 2,
    boxShadow: `-3px 3px 0px ${colors.border}`,
    marginTop: 20,
  },
  scanText: { fontSize: 16, color: colors.navy },
  orRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 16 },
  orLine: { flex: 1, height: 1, backgroundColor: colors.divider },
  orText: { color: colors.muted, fontSize: 13 },
  connectRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 14 },
  connectButton: { paddingHorizontal: 18, marginTop: -5 },
  error: { color: colors.red, marginTop: 10 },
});
