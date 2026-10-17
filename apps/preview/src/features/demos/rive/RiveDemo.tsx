import { useEffect, useEffectEvent } from "react";
import { Image } from "react-native";
import { Stack, useIsFocused } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { PreviewStage } from "../../preview/PreviewStage";
import { usePreview } from "../../shell/usePreview";

const asset = require("./assets/dexHeadoutIntegration.riv");

export function RiveDemo() {
  const { session, t, fullscreen, setFullscreen } = usePreview();
  const focused = useIsFocused();
  const missingScene = session.riv === null;
  const open = useEffectEvent(() => {
    if (session.riv?.origin !== "demo") session.openRiveDemo(Image.resolveAssetSource(asset).uri);
  });
  useEffect(() => {
    if (focused) open();
  }, [focused, missingScene]);
  return (
    <SafeAreaView
      edges={fullscreen ? [] : ["left", "right"]}
      style={{ flex: 1, backgroundColor: t.bg }}
    >
      <Stack.Screen options={{ headerShown: !fullscreen }} />
      {session.riv?.origin === "demo" && (
        <PreviewStage
          session={session}
          fullscreen={fullscreen}
          onToggleFullscreen={() => setFullscreen(!fullscreen)}
          t={t}
        />
      )}
    </SafeAreaView>
  );
}
