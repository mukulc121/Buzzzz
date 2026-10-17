import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Film } from "lucide-react-native";
import { OutlineButton } from "../../components/OutlineButton";
import { Panel } from "../../components/Panel";
import { TAB_CONTENT_INSET, TabHeader } from "../../components/TabHeader";
import { ThemedText } from "../../components/ThemedText";
import { font } from "../../theme/typography";
import { usePreview } from "../shell/usePreview";
import { PreviewStage } from "./PreviewStage";
export function RivePreviewScreen() {
  const { t, session, fullscreen, setFullscreen } = usePreview();
  const router = useRouter();
  return (
    <SafeAreaView
      edges={fullscreen ? [] : ["top", "left", "right"]}
      style={{ flex: 1, backgroundColor: t.bg }}
    >
      <View
        style={{
          paddingHorizontal: TAB_CONTENT_INSET,
          paddingBottom: 16,
          display: fullscreen ? "none" : "flex",
        }}
      >
        <TabHeader title="Rive Live Preview">
          <ThemedText>
            {session.relay.host
              ? `Connected to ${session.relay.host}`
              : "Preview your animation with real haptics."}
          </ThemedText>
        </TabHeader>
      </View>
      {session.riv ? (
        <PreviewStage
          session={session}
          fullscreen={fullscreen}
          onToggleFullscreen={() => setFullscreen(!fullscreen)}
          t={t}
        />
      ) : (
        <View style={{ padding: 16, gap: 24 }}>
          <Panel t={t}>
            <Film size={40} color={t.highlight} />
            <Text style={{ color: t.fg, ...font.bold, fontSize: 22 }}>
              {session.relay.status === "connected"
                ? "Ready for your animation"
                : "Connect to Studio"}
            </Text>
            <Text style={{ color: t.fg2, ...font.regular, fontSize: 16, lineHeight: 24 }}>
              1. Connect your phone on Home. 2. Load a Rive file in Studio and map its triggers. 3.
              Send it to this phone, then replay or explore it fullscreen.
            </Text>
            <OutlineButton title="Open connections" onPress={() => router.navigate("/")} t={t} />
          </Panel>
        </View>
      )}
    </SafeAreaView>
  );
}
