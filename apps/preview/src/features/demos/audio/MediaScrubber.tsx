import { useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  GestureDetector,
  useExclusiveGestures,
  usePanGesture,
  useTapGesture,
} from "react-native-gesture-handler";

const THUMB = 18;
const COLOR = "rgba(56, 172, 221, 1)";
interface IMediaScrubber {
  positionMs: number;
  durationMs: number;
  onScrub?: (ms: number | null) => void;
  onSeek: (ms: number) => void;
  testID?: string;
}
export function MediaScrubber(props: IMediaScrubber) {
  const { positionMs, durationMs, onScrub, onSeek, testID } = props;
  const [width, setWidth] = useState(0);
  const [draggedToMs, setDraggedToMs] = useState<number | null>(null);
  const enabled = durationMs > 0 && width > 0;
  const shown = draggedToMs ?? positionMs;
  const fraction = durationMs > 0 ? Math.max(0, Math.min(1, shown / durationMs)) : 0;
  const toMs = (x: number) => Math.max(0, Math.min(1, x / width)) * durationMs;
  const dragTo = (x: number) => {
    const ms = toMs(x);
    setDraggedToMs(ms);
    onScrub?.(ms);
  };
  const clear = () => {
    setDraggedToMs(null);
    onScrub?.(null);
  };
  const seekTo = (x: number) => {
    const ms = toMs(x);
    clear();
    onSeek(ms);
  };
  const pan = usePanGesture({
    enabled,
    minDistance: 0,
    runOnJS: true,
    onBegin: (event) => dragTo(event.x),
    onUpdate: (event) => dragTo(event.x),
    onDeactivate: (event) => seekTo(event.x),
    onFinalize: clear,
  });
  const tap = useTapGesture({ enabled, runOnJS: true, onDeactivate: (event) => seekTo(event.x) });
  const gesture = useExclusiveGestures(pan, tap);
  return (
    <GestureDetector gesture={gesture}>
      <View
        testID={testID}
        style={styles.touchArea}
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      >
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${fraction * 100}%`, backgroundColor: COLOR }]} />
        </View>
        <View style={[styles.thumb, { left: fraction * (width - THUMB), borderColor: COLOR }]} />
      </View>
    </GestureDetector>
  );
}
const styles = StyleSheet.create({
  touchArea: { height: 32, justifyContent: "center" },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(213, 230, 242, 1)",
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: 3 },
  thumb: {
    position: "absolute",
    width: THUMB,
    height: THUMB,
    borderRadius: 9,
    backgroundColor: "rgba(255, 255, 255, 1)",
    borderWidth: 2,
  },
});
