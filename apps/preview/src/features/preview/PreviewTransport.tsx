import { View } from "react-native";
import { Pause, Play, RotateCcw } from "lucide-react-native";
import { OutlineButton } from "../../components/OutlineButton";
import type { Theme } from "../../theme/colors";
interface IPreviewTransport {
  paused: boolean;
  onReplay: () => void;
  onTogglePause: () => void;
  t: Theme;
  fullscreen?: boolean;
}
export function PreviewTransport(props: IPreviewTransport) {
  const { paused, onReplay, onTogglePause, t, fullscreen } = props;
  const Icon = paused ? Play : Pause;
  return (
    <View style={{ flexDirection: "row", gap: 12 }}>
      <OutlineButton
        title="Replay"
        accessibilityLabel="Replay animation with haptics"
        onPress={onReplay}
        icon={<RotateCcw size={20} color={t.fg} />}
        t={t}
        style={{ flex: 1 }}
      />
      <OutlineButton
        title={paused ? (fullscreen ? "Play" : "Resume") : "Pause"}
        accessibilityLabel={
          paused ? (fullscreen ? "Play animation" : "Resume animation") : "Pause animation"
        }
        onPress={onTogglePause}
        icon={<Icon size={20} color={t.fg} />}
        t={t}
        style={{ flex: 1 }}
      />
    </View>
  );
}
