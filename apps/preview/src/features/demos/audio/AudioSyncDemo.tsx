import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import type { PresetHandle } from "react-native-pulsar";
import { Button } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { ThemedText } from "../../../components/ThemedText";
import { margins } from "../../../theme/margins";
import { loadBundleAsync } from "../../../../assets/bundles/PulsarAppBundle.bundle";
import { formatMs } from "./formatMs";
import { MediaCredit } from "./MediaCredit";
import { MediaScrubber } from "./MediaScrubber";
import { usePlaybackClock } from "./usePlaybackClock";

export function AudioSyncDemo() {
  const [preset, setPreset] = useState<PresetHandle | null>(null);
  useEffect(() => {
    let cancelled = false;
    let loaded: Awaited<ReturnType<typeof loadBundleAsync>> | null = null;
    loadBundleAsync()
      .then((bundle) => {
        if (cancelled) return bundle.dispose();
        loaded = bundle;
        setPreset(bundle.fanfaresound);
      })
      .catch((error: unknown) => console.warn("Pulsar: could not load the demo bundle", error));
    return () => {
      cancelled = true;
      loaded?.dispose();
    };
  }, []);
  const duration = preset?.duration ?? 0;
  const clock = usePlaybackClock(duration);
  const [draggedMs, setDraggedMs] = useState<number | null>(null);
  const playFrom = (ms: number) => {
    if (!preset) return;
    preset.stop();
    preset.play(ms);
    clock.start(ms);
  };
  const stopPlayback = () => {
    preset?.stop();
    clock.stop();
  };
  const onTransport = () => {
    if (clock.isRunning) return stopPlayback();
    playFrom(clock.positionMs >= duration ? 0 : clock.positionMs);
  };
  const onSeek = (ms: number) => {
    if (clock.isRunning) return playFrom(ms);
    preset?.stop();
    clock.jumpTo(ms);
  };
  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.container}>
        <ThemedText type="title" style={margins.marginTop4X}>
          Audio-synced haptics
        </ThemedText>
        <ThemedText style={margins.marginTop2X}>
          A preset from a <ThemedText type="defaultSemiBold">.pulsar</ThemedText> bundle, its audio
          and haptics on one native clock. Drag the bar to play from anywhere. Best felt on a real
          device.
        </ThemedText>
        <Card style={margins.marginTop4X}>
          <ThemedText testID="audio-demo-source" type="defaultSemiBold" numberOfLines={1}>
            fanfare.mp3
          </ThemedText>
          <View style={margins.marginTop1X}>
            <MediaScrubber
              testID="audio-demo-scrubber"
              positionMs={clock.positionMs}
              durationMs={duration}
              onScrub={setDraggedMs}
              onSeek={onSeek}
            />
          </View>
          <ThemedText testID="audio-demo-position" style={styles.meta}>
            {formatMs(draggedMs ?? clock.positionMs)} / {formatMs(duration)}
          </ThemedText>
          <Button
            testID="audio-demo-transport"
            accessibilityLabel={clock.isRunning ? "Stop" : "Play"}
            label={clock.isRunning ? "Stop" : "Play"}
            showIcon={clock.isRunning ? "stop" : "play"}
            style={margins.marginTop3X}
            state={preset ? "default" : "loading"}
            disableHaptics
            onClick={onTransport}
          />
        </Card>
        <MediaCredit />
      </View>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 40 },
  container: { paddingLeft: 15, paddingRight: 15 },
  meta: { fontSize: 14, color: "rgba(73, 102, 149, 1)" },
});
