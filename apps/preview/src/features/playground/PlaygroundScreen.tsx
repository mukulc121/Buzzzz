import { useEffect } from "react";
import { Platform, TextInput, View } from "react-native";
import { Pressable } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { useAnimatedProps, useSharedValue } from "react-native-reanimated";
import { Link } from "expo-router";
import { Button } from "../../components/Button";
import { Icon } from "../../components/Icon";
import { ThemedText } from "../../components/ThemedText";
import { TabHeader } from "../../components/TabHeader";
import { colors } from "../../theme/colors";
import { TouchPad } from "./TouchPad";
import { exportPattern } from "./exportPattern";
import { playgroundTimer } from "./recording";
import { playgroundStyles as styles } from "./playgroundStyles";
import { usePlaygroundRecorder } from "./usePlaygroundRecorder";

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

export function PlaygroundScreen() {
  const recorder = usePlaygroundRecorder();
  const { recording, playing, duration } = recorder;
  const timerText = useSharedValue("");
  useEffect(() => {
    const started = Date.now();
    const update = () => {
      const elapsed = recording || playing ? Date.now() - started : duration;
      timerText.set(playgroundTimer(recording, playing, elapsed, duration).text);
    };
    update();
    if (!recording && !playing) return;
    const timer = setInterval(update, 100);
    return () => clearInterval(timer);
  }, [duration, playing, recording, timerText]);
  const timerProps = useAnimatedProps(() => ({
    text: timerText.get(),
    defaultValue: timerText.get(),
  }));
  return (
    <SafeAreaView
      edges={{ top: "additive", left: "additive", bottom: "off", right: "additive" }}
      style={styles.safeArea}
    >
      <View style={styles.container}>
        <TabHeader
          title="Playground"
          trailing={
            <Link href="/playgroundModal" accessibilityLabel="How does it work?">
              <Link.Trigger>
                <View style={styles.infoButton}>
                  <ThemedText>How does it work?</ThemedText>
                  <Icon name="info" size={18} color={colors.navy} />
                </View>
              </Link.Trigger>
            </Link>
          }
        />
        {Platform.OS === "android" && (
          <Link href="/playgroundSettingsModal" asChild>
            <Pressable style={styles.settingsRow} accessibilityRole="button">
              <ThemedText style={styles.settingsLabel}>Realtime composer settings</ThemedText>
              <Icon name="sliders" size={20} color={colors.navy} />
            </Pressable>
          </Link>
        )}
        <View style={styles.playgroundWrapper}>
          <TouchPad recordEvent={recorder.recordEvent} />
          {(recording || duration > 0) && (
            <View style={styles.timerRow}>
              <ThemedText style={styles.timerLabel}>
                {playing ? "Playing" : recording ? "Recording" : "Duration"}
              </ThemedText>
              <AnimatedTextInput
                style={[styles.timerValue, { color: colors.navy }]}
                animatedProps={timerProps}
                editable={false}
              />
            </View>
          )}
        </View>
        <View style={styles.controls}>
          <Button
            enabled={duration > 0}
            onClick={playing ? recorder.stopPlaying : recorder.playRecordedPattern}
            showIcon={playing ? "stop" : "play"}
            largeIcon
            accessibilityLabel={playing ? "Pause" : "Play"}
          />
          <Button
            label={recording ? "Stop" : "Record"}
            onClick={recording ? recorder.stopRecording : recorder.startRecording}
            showIcon={recording ? "square" : "record"}
          />
          <Button
            enabled={duration > 0}
            onClick={() => {
              void exportPattern(recorder.getEvents()).catch((error: unknown) =>
                console.error("Error sharing:", error),
              );
            }}
            showIcon="download"
            largeIcon
            accessibilityLabel="Download"
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
