import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Card } from "../../components/Card";
import { Icon } from "../../components/Icon";
import { ThemedText } from "../../components/ThemedText";
import { colors } from "../../theme/colors";
import { deriveConnectionRow } from "./model";

interface IConnectionCard {
  connection: { label: string; status: "idle" | "connecting" | "connected" | "error" };
  onOpen: () => void;
  onReconnect: () => void;
  onRemove: () => void;
}

export function ConnectionCard(props: IConnectionCard) {
  const { connection, onOpen, onReconnect, onRemove } = props;
  const { color, label } = deriveConnectionRow(connection.status);
  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <TouchableOpacity
          onPress={onOpen}
          activeOpacity={0.6}
          style={styles.pressArea}
          accessibilityRole="button"
          accessibilityLabel={`Open haptics from ${connection.label}`}
        >
          <View style={[styles.dot, { backgroundColor: color }]} />
          <View style={styles.info}>
            <View style={styles.nameRow}>
              <ThemedText type="defaultSemiBold" style={styles.name} numberOfLines={1}>
                {connection.label}
              </ThemedText>
              <View style={styles.chip}>
                <ThemedText style={styles.chipText}>Browser</ThemedText>
              </View>
            </View>
            <ThemedText style={styles.status} numberOfLines={1}>
              {label}
            </ThemedText>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onReconnect}
          hitSlop={8}
          style={styles.iconButton}
          accessibilityRole="button"
          accessibilityLabel="Reload connection"
        >
          <Icon name="refresh-cw" size={20} color={colors.navy} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onRemove}
          hitSlop={8}
          style={styles.iconButton}
          accessibilityRole="button"
          accessibilityLabel="Remove connection"
        >
          <Icon name="x" size={22} color={colors.red} />
        </TouchableOpacity>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { paddingVertical: 12, paddingHorizontal: 14, marginTop: 10 },
  row: { flexDirection: "row", alignItems: "center" },
  pressArea: { flex: 1, flexDirection: "row", alignItems: "center", marginRight: 8 },
  dot: { width: 12, height: 12, borderRadius: 6, marginRight: 10 },
  info: { flex: 1 },
  nameRow: { flexDirection: "row", alignItems: "center" },
  name: { flexShrink: 1 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginLeft: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: "rgba(234, 238, 245, 1)",
  },
  chipText: { fontSize: 11, lineHeight: 14, color: colors.muted },
  status: { fontSize: 13, color: colors.muted, marginTop: 1 },
  iconButton: { paddingHorizontal: 6, paddingVertical: 2 },
});
