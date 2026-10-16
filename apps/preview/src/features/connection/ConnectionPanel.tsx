import { useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { ChevronDown, ChevronRight } from "lucide-react-native";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { Icon } from "../../components/Icon";
import { ThemedText } from "../../components/ThemedText";
import { colors, type Theme } from "../../theme/colors";
import type { usePhoneRelay } from "./usePhoneRelay";
import { QrScanner } from "./QrScanner";

interface IConnectionPanel {
  relay: ReturnType<typeof usePhoneRelay>;
  t: Theme;
}
export function ConnectionPanel(props: IConnectionPanel) {
  const { relay, t } = props;
  const [scanner, setScanner] = useState(false);
  const [help, setHelp] = useState(false);
  const [focused, setFocused] = useState(false);
  const submit = () => {
    if (relay.input.trim()) relay.connect(relay.input.trim());
  };
  return (
    <Card>
      <ThemedText type="subtitle">Add a new connection</ThemedText>
      <ThemedText style={{ marginTop: 10 }}>
        Scan a pairing QR code or paste a Studio link below to add another producer.
      </ThemedText>
      <TouchableOpacity
        onPress={() => setScanner(true)}
        activeOpacity={0.85}
        style={[styles.scanButton, { marginTop: 20 }]}
        accessibilityRole="button"
        accessibilityLabel="Scan QR code"
      >
        <Icon name="qr-code" size={20} color={colors.navy} />
        <Text style={styles.scanText}>Scan QR code</Text>
      </TouchableOpacity>
      <View style={styles.orRow}>
        <View style={styles.orLine} />
        <Text style={styles.orText}>or paste a link</Text>
        <View style={styles.orLine} />
      </View>
      <View style={styles.connectRow}>
        <TextInput
          accessibilityLabel="Relay address"
          accessibilityHint="Studio pairing link or local WebSocket relay address"
          value={relay.input}
          onChangeText={relay.setInput}
          style={[
            styles.input,
            {
              fontSize: focused || relay.input !== "" ? 25 : 16,
              paddingVertical: focused || relay.input !== "" ? 12.5 : 16,
            },
          ]}
          placeholder="Studio link"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="go"
          onSubmitEditing={submit}
        />
        <Button label="Connect" style={styles.connectButton} onClick={submit} />
      </View>
      {relay.error && (
        <ThemedText accessibilityRole="alert" style={{ color: colors.red, marginTop: 10 }}>
          {relay.error}
        </ThemedText>
      )}
      <TouchableOpacity
        onPress={() => setHelp(!help)}
        style={styles.helpHeading}
        accessibilityRole="button"
        accessibilityState={{ expanded: help }}
      >
        {help ? (
          <ChevronDown color={colors.navy} size={18} />
        ) : (
          <ChevronRight color={colors.navy} size={18} />
        )}
        <ThemedText>How to connect a device? 🤔</ThemedText>
      </TouchableOpacity>
      {help && (
        <View style={{ marginTop: 6, marginLeft: 24, gap: 10 }}>
          <ThemedText>
            1. Open the Device panel in Buzzzz Studio and choose Connect device.
          </ThemedText>
          <ThemedText>
            2. Scan the QR code with this app, or paste its address above and tap Connect.
          </ThemedText>
          <ThemedText>
            3. Pick a preset in Studio and feel the haptics right on your device.
          </ThemedText>
        </View>
      )}
      {scanner && (
        <QrScanner onClose={() => setScanner(false)} onConnect={relay.requestConnection} t={t} />
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
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
  },
  scanText: { fontSize: 16, color: colors.navy },
  orRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 16 },
  orLine: { flex: 1, height: 1, backgroundColor: colors.divider },
  orText: { color: colors.muted, fontSize: 13 },
  connectRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 14 },
  input: {
    flex: 1,
    borderRadius: 4,
    paddingHorizontal: 10,
    borderColor: colors.tag,
    borderWidth: 2,
    color: colors.navy,
  },
  connectButton: { paddingHorizontal: 18, marginTop: -5 },
  helpHeading: { marginTop: 20, flexDirection: "row", alignItems: "center", gap: 6 },
});
