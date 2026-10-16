import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { Circle, Download, Play, Square } from "lucide-react-native";
import { patternEnd, type Pattern } from "@buzzzz/core";
import { OutlineButton } from "../../components/OutlineButton";
import { ScreenHeading } from "../../components/ScreenHeading";
import { Panel } from "../../components/Panel";
import { font } from "../../theme/typography";
import { PatternWaveform } from "../playback/PatternWaveform";
import { usePreview } from "../shell/usePreview";
import { appendSample, appendTap, recordedPattern, recording } from "./recording";
import { TouchPad } from "./TouchPad";
import { exportPattern } from "./exportPattern";

export function PlaygroundScreen() {
  const { t, session } = usePreview();
  const current = useRef<ReturnType<typeof recording> | null>(null);
  const [recordingNow, setRecordingNow] = useState(false);
  const [pattern, setPattern] = useState<Pattern | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const finish = useCallback(() => {
    if (!current.current) return;
    appendSample(current.current, null);
    setPattern(recordedPattern(current.current));
    current.current = null;
    setRecordingNow(false);
  }, []);
  useFocusEffect(useCallback(() => finish, [finish]));
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") finish();
    });
    return () => sub.remove();
  }, [finish]);
  useEffect(() => {
    if (!recordingNow) return;
    const timer = setTimeout(finish, 60_000);
    return () => clearTimeout(timer);
  }, [recordingNow, finish]);
  const toggleRecording = () => {
    if (recordingNow) finish();
    else {
      session.playback.stopPattern();
      setError(null);
      current.current = recording();
      setRecordingNow(true);
    }
  };
  const share = () => {
    if (!pattern) return;
    setSharing(true);
    setError(null);
    void exportPattern(pattern)
      .catch(() => setError("The recording could not be shared. Try again."))
      .finally(() => setSharing(false));
  };
  return (
    <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24, gap: 24 }}>
        <ScreenHeading
          title="Playground"
          subtitle="Tap for a pulse. Drag to shape a continuous feeling."
          t={t}
        />
        <TouchPad
          t={t}
          onSample={(value) => {
            if (current.current) appendSample(current.current, value);
          }}
          onTap={(value) => {
            if (current.current) appendTap(current.current, value);
          }}
        />
        <Text style={{ color: t.fg2, ...font.regular, fontSize: 15, lineHeight: 22 }}>
          Move left to right for frequency. Move up for stronger intensity. Record up to one minute,
          then play or export your pattern.
        </Text>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <OutlineButton
            title={recordingNow ? "Stop recording" : "Record"}
            icon={
              recordingNow ? <Square size={18} color={t.err} /> : <Circle size={18} color={t.err} />
            }
            onPress={toggleRecording}
            t={t}
            style={{ flex: 1 }}
          />
          <OutlineButton
            title="Play"
            icon={<Play size={18} color={t.fg} />}
            disabled={!pattern || recordingNow}
            onPress={() => {
              if (pattern) session.playback.playPattern(pattern, "Playground recording");
            }}
            t={t}
            style={{ flex: 1 }}
          />
        </View>
        {recordingNow && (
          <Text accessibilityLiveRegion="polite" style={{ color: t.err, ...font.medium }}>
            Recording…
          </Text>
        )}
        {pattern && (
          <Panel t={t}>
            <Text style={{ color: t.fg, ...font.bold, fontSize: 20 }}>
              Your recording · {(patternEnd(pattern) / 1000).toFixed(1)}s
            </Text>
            <PatternWaveform pattern={pattern} t={t} />
            <OutlineButton
              title={sharing ? "Opening share sheet…" : "Export JSON"}
              disabled={sharing || recordingNow}
              onPress={share}
              icon={<Download size={18} color={t.fg} />}
              t={t}
            />
          </Panel>
        )}
        {error && (
          <Text accessibilityRole="alert" style={{ color: t.err, ...font.regular }}>
            {error}
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
