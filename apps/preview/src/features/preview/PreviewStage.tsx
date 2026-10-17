import { useIsFocused } from "expo-router";
import { useMemo } from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PressableScale } from "../../components/PressableScale";
import type { Theme } from "../../theme/colors";
import { RivePlayer } from "../playback/RivePlayer";
import type { usePreviewSession } from "./usePreviewSession";
import { PreviewTransport } from "./PreviewTransport";
import { TriggerList } from "./TriggerList";
import { previewStyles } from "./previewStyles";

interface IPreviewStage {
  session: ReturnType<typeof usePreviewSession>;
  fullscreen: boolean;
  onToggleFullscreen: () => void;
  t: Theme;
}
export function PreviewStage(props: IPreviewStage) {
  const { session, fullscreen, onToggleFullscreen, t } = props;
  const s = useMemo(() => previewStyles(t), [t]);
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  if (!session.riv) return null;
  return (
    <View style={[s.wrap, fullscreen && s.fullscreen]}>
      <View testID="rive-preview-stage" style={[s.stage, fullscreen && s.fullStage]}>
        <RivePlayer
          key={session.riv.url + session.riv.stateMachine}
          {...session.riv}
          run={session.run}
          paused={session.paused}
          active={focused}
          t={t}
          onTrigger={session.onTrigger}
          onTriggers={session.setTriggers}
          onStopHaptics={session.stopRiveHaptics}
          onHapticsEnabled={session.setRiveHapticsEnabled}
          onSceneMount={session.mountRiveScene}
          onSceneBound={session.bindRiveScene}
          fireRef={session.fireRef}
          pauseRef={session.pauseRef}
        />
        <PressableScale
          style={[
            s.expand,
            fullscreen && { top: insets.top + 8, right: Math.max(8, insets.right + 8) },
          ]}
          onPress={onToggleFullscreen}
          accessibilityLabel={fullscreen ? "Exit fullscreen preview" : "Enter fullscreen preview"}
        >
          <Text style={s.expandText}>{fullscreen ? "Exit fullscreen" : "Fullscreen"}</Text>
        </PressableScale>
        {fullscreen && (
          <View
            style={[
              s.fullscreenTransport,
              {
                left: Math.max(16, insets.left + 16),
                right: Math.max(16, insets.right + 16),
                bottom: Math.max(16, insets.bottom + 16),
              },
            ]}
          >
            <PreviewTransport
              paused={session.paused}
              onReplay={session.replay}
              onTogglePause={session.togglePause}
              fullscreen
              t={t}
            />
          </View>
        )}
      </View>
      {!fullscreen && (
        <>
          <PreviewTransport
            paused={session.paused}
            onReplay={session.replay}
            onTogglePause={session.togglePause}
            t={t}
          />
          <TriggerList session={session} t={t} />
        </>
      )}
    </View>
  );
}
