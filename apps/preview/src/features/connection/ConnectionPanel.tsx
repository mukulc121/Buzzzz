import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { ChevronDown, ChevronRight, QrCode } from "lucide-react-native";
import { Panel } from "../../components/Panel";
import { OutlineButton } from "../../components/OutlineButton";
import { PressableScale } from "../../components/PressableScale";
import type { Theme } from "../../theme/colors";
import { font } from "../../theme/typography";
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
  const submit = () => {
    if (relay.input.trim()) relay.connect(relay.input.trim());
  };
  return (
    <Panel t={t}>
      <Text style={{ fontFamily: font.bold, fontSize: 22, color: t.fg }}>Add a new connection</Text>
      <Text style={{ fontFamily: font.regular, color: t.fg, fontSize: 16, lineHeight: 23 }}>
        Scan a pairing QR code or paste a Studio link below to connect this phone.
      </Text>
      <OutlineButton
        title="Scan QR code"
        onPress={() => setScanner(true)}
        icon={<QrCode color={t.fg} size={22} />}
        t={t}
      />
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ height: 1, flex: 1, backgroundColor: t.line }} />
        <Text style={{ color: t.muted, fontFamily: font.regular, fontSize: 14 }}>
          or paste a link
        </Text>
        <View style={{ height: 1, flex: 1, backgroundColor: t.line }} />
      </View>
      <View style={{ flexDirection: "row", gap: 12, alignItems: "stretch" }}>
        <TextInput
          accessibilityLabel="Relay address"
          accessibilityHint="Studio pairing link or local WebSocket relay address"
          value={relay.input}
          onChangeText={relay.setInput}
          style={{
            flex: 1,
            minWidth: 0,
            minHeight: 50,
            borderWidth: 1,
            borderColor: relay.error ? t.err : t.line,
            borderRadius: 4,
            backgroundColor: t.panel,
            color: t.fg,
            padding: 10,
            fontFamily: font.regular,
            fontSize: 16,
          }}
          placeholder="Studio link"
          placeholderTextColor={t.muted}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          returnKeyType="go"
          onSubmitEditing={submit}
        />
        <OutlineButton
          title={relay.status === "connecting" ? "Connecting…" : "Connect"}
          disabled={!relay.input.trim() || relay.status === "connecting"}
          onPress={submit}
          t={t}
        />
      </View>
      {relay.error && (
        <Text
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={{ color: t.err, fontSize: 15, lineHeight: 21, fontFamily: font.regular }}
        >
          {relay.error}
        </Text>
      )}
      <PressableScale
        onPress={() => setHelp(!help)}
        style={{ minHeight: 44, flexDirection: "row", alignItems: "center", gap: 8 }}
      >
        {help ? <ChevronDown color={t.fg} size={20} /> : <ChevronRight color={t.fg} size={20} />}
        <Text style={{ color: t.fg, fontFamily: font.medium, fontSize: 16 }}>
          How to connect a device?
        </Text>
      </PressableScale>
      {help && (
        <Text style={{ color: t.fg2, fontFamily: font.regular, fontSize: 15, lineHeight: 22 }}>
          In Studio, open Phone and scan its QR code. Hosted pairing works across networks. For a
          local connection, join the same Wi-Fi and paste ws://192.168.1.2:5173/relay.
        </Text>
      )}
      {scanner && (
        <QrScanner onClose={() => setScanner(false)} onConnect={relay.requestConnection} t={t} />
      )}
    </Panel>
  );
}
