import { useState } from "react";
import { View } from "react-native";
import {
  GestureDetector,
  useExclusiveGestures,
  usePanGesture,
  useTapGesture,
} from "react-native-gesture-handler";
import { scheduleOnRN } from "react-native-worklets";
import { colors } from "../../theme/colors";
import { scrubTime } from "./canvasGeometry";
import { libraryStyles as styles } from "./libraryStyles";

interface ILibraryScrubber {
  positionMs: number;
  durationMs: number;
  disabled: boolean;
  onScrub: (timeMs: number | null) => void;
  onSeek: (timeMs: number) => void;
}

export function LibraryScrubber(props: ILibraryScrubber) {
  const { positionMs, durationMs, disabled, onScrub, onSeek } = props;
  const [width, setWidth] = useState(0);
  const [draggedTo, setDraggedTo] = useState<number | null>(null);
  const enabled = !disabled && durationMs > 0 && width > 0;
  const fraction =
    durationMs > 0 ? Math.max(0, Math.min(1, (draggedTo ?? positionMs) / durationMs)) : 0;
  const dragTo = (x: number) => {
    const time = scrubTime(x, width, durationMs);
    setDraggedTo(time);
    onScrub(time);
  };
  const finish = () => {
    setDraggedTo(null);
    onScrub(null);
  };
  const seekTo = (x: number) => {
    finish();
    onSeek(scrubTime(x, width, durationMs));
  };
  const pan = usePanGesture({
    enabled,
    minDistance: 0,
    onBegin: (event) => scheduleOnRN(dragTo, event.x),
    onUpdate: (event) => scheduleOnRN(dragTo, event.x),
    onDeactivate: (event) => {
      if (!event.canceled) scheduleOnRN(seekTo, event.x);
    },
    onFinalize: () => scheduleOnRN(finish),
  });
  const tap = useTapGesture({ enabled, onActivate: (event) => scheduleOnRN(seekTo, event.x) });
  const gesture = useExclusiveGestures(pan, tap);
  return (
    <GestureDetector gesture={gesture}>
      <View
        testID="library-scrubber"
        style={styles.scrubTouch}
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Playback position"
        accessibilityState={{ disabled: !enabled }}
        accessibilityValue={{
          min: 0,
          max: durationMs,
          now: Math.min(durationMs, Math.max(0, positionMs)),
        }}
        accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
        onAccessibilityAction={(event) => {
          if (!enabled) return;
          const delta =
            event.nativeEvent.actionName === "increment"
              ? 1000
              : event.nativeEvent.actionName === "decrement"
                ? -1000
                : 0;
          if (delta) onSeek(Math.min(durationMs, Math.max(0, positionMs + delta)));
        }}
      >
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${fraction * 100}%`, backgroundColor: colors.navy },
            ]}
          />
        </View>
        {enabled && (
          <View
            pointerEvents="none"
            style={[styles.scrubThumb, { left: fraction * (width - 18) }]}
          />
        )}
      </View>
    </GestureDetector>
  );
}
