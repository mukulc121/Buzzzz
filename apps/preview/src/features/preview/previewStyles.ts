import { font } from "../../theme/typography";
import { StyleSheet } from "react-native";
import type { Theme } from "../../theme/colors";

export const previewStyles = (t: Theme) =>
  StyleSheet.create({
    wrap: { flex: 1, padding: 16, gap: 14 },
    fullscreen: { ...StyleSheet.absoluteFill, padding: 0, gap: 0 },
    stage: {
      flex: 1,
      borderRadius: 4,
      backgroundColor: t.panel,
      overflow: "hidden",
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.highlight,
    },
    fullStage: { borderRadius: 0, borderWidth: 0 },
    fullscreenTransport: {
      position: "absolute",
    },
    expand: {
      position: "absolute",
      right: 8,
      top: 8,
      minHeight: 44,
      paddingHorizontal: 12,
      paddingVertical: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: t.panel,
      borderColor: t.highlight,
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: 4,
    },
    section: { color: t.fg2, fontSize: 14, ...font.medium },
    chips: { gap: 8, paddingRight: 16, alignItems: "center" },
    chipScroll: { flexGrow: 0 },
    triggers: { gap: 10 },
  });
