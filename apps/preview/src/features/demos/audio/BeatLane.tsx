import { StyleSheet, View } from "react-native";
import type { Theme } from "../../../theme/colors";
import { demoColors } from "../shared/demoStyles";
import { BEATS, TRACK_MS } from "./beats";

interface IBeatLane {
  t: Theme;
  progress: number;
}
export function BeatLane(props: IBeatLane) {
  const { t, progress } = props;
  return (
    <View style={[styles.lane, { backgroundColor: t.sunken, borderColor: t.line }]}>
      {BEATS.map((beat) => (
        <View
          key={beat.time}
          style={[
            beat.hit === "kick" ? styles.kick : styles.hat,
            { left: `${(beat.time / TRACK_MS) * 100}%`, backgroundColor: t.fg2 },
          ]}
        />
      ))}
      <View style={[styles.head, { left: `${progress * 100}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  lane: {
    height: 56,
    borderWidth: 1,
    borderRadius: 4,
    overflow: "hidden",
    justifyContent: "center",
  },
  kick: { position: "absolute", width: 8, height: 28, borderRadius: 2 },
  hat: { position: "absolute", width: 4, height: 14, borderRadius: 2 },
  head: { position: "absolute", top: 0, bottom: 0, width: 2, backgroundColor: demoColors.cyan },
});
