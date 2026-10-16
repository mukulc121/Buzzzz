import { StyleSheet } from "react-native";
import type { Theme } from "../../../theme/colors";

// Saturated cyan outline + hard bottom-left shadow, matching the Pulsar demos look.
const CYAN = "rgba(0, 184, 230, 1)";
const SHADOW = "rgba(0, 184, 230, 0.9)";
const regular = "DMSans_400Regular";
const bold = "DMSans_700Bold";

const build = (t: Theme) =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: t.bg },
    content: { padding: 20, paddingBottom: 40, gap: 16 },
    title: { color: t.fg, fontFamily: bold, fontSize: 31, letterSpacing: -0.4 },
    body: { color: t.fg2, fontFamily: regular, fontSize: 16, lineHeight: 23 },
    muted: { color: t.muted, fontFamily: regular, fontSize: 14, lineHeight: 20 },
    card: {
      backgroundColor: t.panel,
      borderWidth: 1,
      borderColor: CYAN,
      borderRadius: 4,
      padding: 16,
      gap: 10,
      boxShadow: `-3px 3px 0 ${SHADOW}`,
    },
    cardTitle: { color: t.fg, fontFamily: bold, fontSize: 22 },
    row: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    button: {
      minHeight: 44,
      paddingHorizontal: 16,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: t.panel,
      borderWidth: 1,
      borderColor: CYAN,
      borderRadius: 4,
      boxShadow: `-2px 2px 0 ${SHADOW}`,
    },
    buttonPrimary: { backgroundColor: CYAN },
    buttonDisabled: { opacity: 0.45 },
    buttonText: { color: t.fg, fontFamily: bold, fontSize: 16 },
    buttonTextPrimary: { color: "rgba(255, 255, 255, 1)" },
    back: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      minHeight: 44,
      alignSelf: "flex-start",
    },
    backText: { color: t.fg2, fontFamily: bold, fontSize: 16 },
    stage: { height: 220, alignItems: "center", justifyContent: "center" },
    mono: { color: t.fg, fontFamily: bold, fontSize: 64, fontVariant: ["tabular-nums"] },
  });

const cache = new WeakMap<Theme, ReturnType<typeof build>>();
export function demoStyles(t: Theme) {
  const hit = cache.get(t);
  if (hit) return hit;
  const made = build(t);
  cache.set(t, made);
  return made;
}

export const demoColors = { cyan: CYAN };
