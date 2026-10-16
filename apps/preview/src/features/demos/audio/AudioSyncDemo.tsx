import { useEffect, useRef } from "react";
import { Text, View } from "react-native";
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { rangePattern } from "@buzzzz/core";
import type { Theme } from "../../../theme/colors";
import { DemoButton } from "../shared/DemoButton";
import { DemoCard } from "../shared/DemoCard";
import { demoStyles } from "../shared/demoStyles";
import { useAppBackground } from "../shared/useAppBackground";
import { useDemoHaptics } from "../shared/useDemoHaptics";
import { BeatLane } from "./BeatLane";
import { TRACK_MS, beatPattern } from "./beats";

const TRACK = require("./beat.wav");

interface IAudioSyncDemo {
  t: Theme;
}
export function AudioSyncDemo(props: IAudioSyncDemo) {
  const { t } = props;
  const s = demoStyles(t);
  const player = useAudioPlayer(TRACK, { updateInterval: 50 });
  const status = useAudioPlayerStatus(player);
  const haptics = useDemoHaptics();
  const armed = useRef(false);
  const stop = () => {
    armed.current = false;
    player.pause();
    haptics.stop();
  };
  useAppBackground(stop);
  // Haptics start from the player's own reported position once audio is actually running.
  useEffect(() => {
    if (!armed.current || !status.playing) return;
    armed.current = false;
    haptics.play(rangePattern(beatPattern(), player.currentTime * 1000, TRACK_MS));
  }, [status.playing, haptics, player]);
  const play = async () => {
    stop();
    await setAudioModeAsync({ playsInSilentMode: true, interruptionMode: "mixWithOthers" });
    await player.seekTo(0);
    armed.current = true;
    player.play();
  };
  const progress = status.duration ? status.currentTime / status.duration : 0;
  return (
    <DemoCard t={t} title="Kick and hat loop">
      <Text style={s.body}>
        A 4-second beat generated for this app. Kicks land as heavy low taps, hats as light sharp
        ones, both scheduled from the audio clock.
      </Text>
      <BeatLane t={t} progress={status.playing ? progress : 0} />
      <View style={s.row}>
        <DemoButton t={t} primary label={status.playing ? "Restart" : "Play"} onPress={play} />
        <DemoButton t={t} label="Stop" onPress={stop} disabled={!status.playing} />
      </View>
      {status.error ? <Text style={[s.muted, { color: t.err }]}>{status.error}</Text> : null}
    </DemoCard>
  );
}
