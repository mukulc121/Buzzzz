import { ActivityIndicator, Text, View } from "react-native";
import { RotateCw, X } from "lucide-react-native";
import { Panel } from "../../components/Panel";
import { PressableScale } from "../../components/PressableScale";
import type { Theme } from "../../theme/colors";
import { font } from "../../theme/typography";
import type { usePhoneRelay } from "../connection/usePhoneRelay";

interface IConnectionCard {
  relay: ReturnType<typeof usePhoneRelay>;
  onDisconnect: () => void;
  t: Theme;
}
export function ConnectionCard(props: IConnectionCard) {
  const { relay, onDisconnect, t } = props;
  const connected = relay.status === "connected";
  return (
    <Panel t={t} style={{ paddingVertical: 12 }}>
      <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
        {relay.status === "connecting" ? (
          <ActivityIndicator color={t.highlight} />
        ) : (
          <View
            style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: connected ? t.highlight : t.err,
            }}
          />
        )}
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ color: t.fg, fontFamily: font.medium, fontSize: 18 }} numberOfLines={1}>
            {relay.host || "Studio"}
          </Text>
          <Text style={{ color: t.muted, fontFamily: font.regular, fontSize: 14 }}>
            {connected
              ? "Connected · live preview"
              : relay.status === "connecting"
                ? "Connecting…"
                : "Connection interrupted"}
          </Text>
        </View>
        <PressableScale
          accessibilityLabel="Reconnect to Studio"
          onPress={relay.reconnect}
          style={{ minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }}
        >
          <RotateCw size={22} color={t.fg} />
        </PressableScale>
        <PressableScale
          accessibilityLabel="Remove connection"
          onPress={onDisconnect}
          style={{ minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }}
        >
          <X size={22} color={t.err} />
        </PressableScale>
      </View>
    </Panel>
  );
}
