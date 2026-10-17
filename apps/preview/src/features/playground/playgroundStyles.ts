import { StyleSheet } from "react-native";
import { colors } from "../../theme/colors";
import { TAB_CONTENT_INSET } from "../../components/TabHeader";

export const playgroundStyles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, paddingHorizontal: TAB_CONTENT_INSET },
  infoButton: { flexDirection: "row", alignItems: "center", gap: 8 },
  settingsRow: {
    paddingTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  settingsLabel: { fontSize: 15, lineHeight: 20, fontWeight: "600" },
  playgroundWrapper: { flex: 1 },
  gridContainer: { flex: 1, marginVertical: 25 },
  grid: { width: "100%", height: "100%" },
  indicator: {
    position: "absolute",
    left: -100,
    top: -100,
    zIndex: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    opacity: 0.8,
  },
  tapIndicator: { backgroundColor: colors.red },
  panIndicator: { backgroundColor: colors.navy },
  timerRow: {
    position: "absolute",
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  timerLabel: { fontSize: 14, opacity: 0.6 },
  timerValue: { fontSize: 14, fontWeight: "600", minWidth: 80, padding: 0 },
  controls: { flexDirection: "row", justifyContent: "space-between", paddingBottom: 20, gap: 12 },
});
