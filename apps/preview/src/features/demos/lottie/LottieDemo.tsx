import { useRef } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { HapticLottieView, type HapticLottieRef } from "react-native-pulsar-lottie";
import { Button } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { ThemedText } from "../../../components/ThemedText";
import { margins } from "../../../theme/margins";
import animation from "./assets/explosionanimation.json";
import pattern from "./assets/explosionhaptics.json";
import { MediaScrubber } from "../audio/MediaScrubber";
import { formatMs } from "../audio/formatMs";
import { LottieCredit } from "./LottieCredit";
import { useLottiePlayback } from "./useLottiePlayback";

const durationMs = 2333;

export function LottieDemo() {
  const view = useRef<HapticLottieRef>(null);
  const playback = useLottiePlayback(view, pattern, durationMs);
  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.container}>
        <ThemedText type="title" style={margins.marginTop4X}>
          Lottie + haptics
        </ThemedText>
        <ThemedText style={margins.marginTop2X}>
          A preset from a <ThemedText type="defaultSemiBold">.pulsar</ThemedText> bundle carrying
          both the animation and its haptics. Drag the bar to scrub them together.
        </ThemedText>
        <Card style={margins.marginTop4X}>
          <View style={styles.canvas}>
            <HapticLottieView
              ref={view}
              source={animation}
              haptics={pattern}
              durationMs={durationMs}
              style={styles.lottie}
            />
          </View>
          <ThemedText testID="lottie-demo-source" type="defaultSemiBold" numberOfLines={1}>
            Explosion
          </ThemedText>
          <View style={margins.marginTop1X}>
            <MediaScrubber
              testID="lottie-demo-scrubber"
              positionMs={playback.cursorMs}
              durationMs={durationMs}
              onScrub={playback.scrub}
              onSeek={playback.seek}
            />
          </View>
          <ThemedText testID="lottie-demo-position" style={styles.meta}>
            {formatMs(playback.positionMs)} / {formatMs(durationMs)}
          </ThemedText>
          <Button
            testID="lottie-demo-transport"
            label={playback.playing ? "Stop" : "Play"}
            showIcon={playback.playing ? "stop" : "play"}
            style={margins.marginTop3X}
            disableHaptics
            onClick={playback.toggle}
          />
        </Card>
        <LottieCredit />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 40 },
  container: { paddingHorizontal: 15 },
  canvas: {
    height: 200,
    borderRadius: 4,
    backgroundColor: "rgba(225, 243, 250, 1)",
    borderWidth: 2,
    borderColor: "rgba(181, 225, 241, 1)",
    overflow: "hidden",
    marginBottom: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  lottie: { width: 180, height: 180 },
  meta: { fontSize: 14, color: "rgba(73, 102, 149, 1)" },
});
