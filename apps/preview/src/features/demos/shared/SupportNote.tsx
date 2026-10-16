import { useState } from "react";
import { Text } from "react-native";
import { HapticSupport, Settings } from "react-native-pulsar";
import type { Theme } from "../../../theme/colors";
import { demoStyles } from "./demoStyles";

const NOTES: Partial<Record<HapticSupport, string>> = {
  [HapticSupport.NO_SUPPORT]: "This device reports no haptic hardware. Visuals still run.",
  [HapticSupport.LIMITED_SUPPORT]:
    "This device reports limited haptics, so continuous feedback may play as simple ticks.",
};

interface ISupportNote {
  t: Theme;
}
export function SupportNote(props: ISupportNote) {
  const { t } = props;
  const [level] = useState(() => Settings.getHapticsSupportLevel());
  const note = NOTES[level];
  return note ? <Text style={[demoStyles(t).muted, { color: t.err }]}>{note}</Text> : null;
}
