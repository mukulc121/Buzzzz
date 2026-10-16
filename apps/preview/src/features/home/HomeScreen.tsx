import { Image, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { HapticSupport, Settings } from "react-native-pulsar";
import { ScreenHeading } from "../../components/ScreenHeading";
import { Panel } from "../../components/Panel";
import { font } from "../../theme/typography";
import { usePreview } from "../shell/usePreview";
import { ConnectionPanel } from "../connection/ConnectionPanel";
import { ConnectionCard } from "./ConnectionCard";

export function HomeScreen() {
  const { t, session } = usePreview();
  const level = Settings.getHapticsSupportLevel();
  const support =
    level >= HapticSupport.STANDARD_SUPPORT
      ? "Full"
      : level === HapticSupport.LIMITED_SUPPORT
        ? "Limited"
        : "Unavailable";
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={["top", "left", "right"]}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, paddingBottom: 24, gap: 24 }}
      >
        <ScreenHeading
          title="Welcome to Buzzzz!"
          t={t}
          trailing={
            <Image
              source={require("../../../assets/icon.png")}
              style={{ width: 38, height: 38, borderRadius: 8 }}
            />
          }
        />
        <View style={{ gap: 14 }}>
          <Text
            accessibilityRole="header"
            style={{ color: t.fg, fontFamily: font.bold, fontSize: 22 }}
          >
            Your connections
          </Text>
          {session.relay.host ? (
            <ConnectionCard relay={session.relay} onDisconnect={session.disconnect} t={t} />
          ) : (
            <Text style={{ color: t.muted, fontFamily: font.regular, fontSize: 16 }}>
              Connect Studio to feel your patterns here.
            </Text>
          )}
        </View>
        <ConnectionPanel relay={session.relay} t={t} />
        <Panel t={t}>
          <Text style={{ color: t.fg, fontFamily: font.bold, fontSize: 20 }}>
            Haptic support: {support}
          </Text>
          <Text style={{ color: t.fg2, fontFamily: font.regular, fontSize: 15, lineHeight: 22 }}>
            {support === "Full"
              ? "This device supports intensity and frequency control."
              : "Some patterns and frequency changes may feel different on this device."}
          </Text>
        </Panel>
      </ScrollView>
    </SafeAreaView>
  );
}
