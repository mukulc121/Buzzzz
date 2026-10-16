import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { Play, Square, X } from "lucide-react-native";
import { patternEnd } from "@buzzzz/core";
import { Panel } from "../../components/Panel";
import { PressableScale } from "../../components/PressableScale";
import { font } from "../../theme/typography";
import { usePreview } from "../shell/usePreview";

const timestamp = (ms: number) =>
  `${Math.floor(ms / 60000)}:${Math.floor((ms / 1000) % 60)
    .toString()
    .padStart(2, "0")}`;
export function PatternPlaybackBar() {
  const { t, session } = usePreview();
  const { current, replay, stopPattern, dismiss } = session.playback;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!current?.startedAt) return;
    const timer = setInterval(() => setNow(Date.now()), 50);
    return () => clearInterval(timer);
  }, [current]);
  if (!current) return null;
  const duration = patternEnd(current.pattern);
  const elapsed = current.startedAt
    ? Math.min(duration, Math.max(0, now - current.startedAt))
    : duration;
  return (
    <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
      <Panel t={t} style={{ paddingVertical: 10, gap: 8 }}>
        <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
          <View style={{ flex: 1, gap: 6 }}>
            <Text numberOfLines={1} style={{ color: t.fg, fontFamily: font.medium, fontSize: 16 }}>
              {current.name}
            </Text>
            <View
              style={{ height: 4, borderRadius: 2, backgroundColor: t.line, overflow: "hidden" }}
            >
              <View
                style={{
                  height: 4,
                  width: `${duration ? (elapsed / duration) * 100 : 100}%`,
                  backgroundColor: t.highlight,
                }}
              />
            </View>
            <Text style={{ color: t.muted, fontFamily: font.regular, fontSize: 12 }}>
              {timestamp(elapsed)} / {timestamp(duration)}
            </Text>
          </View>
          <PressableScale
            accessibilityLabel={current.startedAt ? "Stop pattern" : "Replay pattern"}
            onPress={current.startedAt ? stopPattern : replay}
            style={{ minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }}
          >
            {current.startedAt ? (
              <Square size={24} color={t.fg} />
            ) : (
              <Play size={24} color={t.fg} />
            )}
          </PressableScale>
          <PressableScale
            accessibilityLabel="Dismiss pattern player"
            onPress={dismiss}
            style={{ minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }}
          >
            <X size={24} color={t.err} />
          </PressableScale>
        </View>
      </Panel>
    </View>
  );
}
