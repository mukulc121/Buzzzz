import { Pressable, StyleSheet, Text, View } from "react-native";
import { Icon } from "../../components/Icon";
import { colors } from "../../theme/colors";
import { useFilters } from "./useFilters";

export function SelectedTags() {
  const { selectedTags, setSelectedTags } = useFilters();
  if (selectedTags.length === 0) return null;
  return (
    <View style={styles.container}>
      {selectedTags.map((tag) => (
        <Pressable
          key={tag}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${tag}`}
          style={styles.tag}
          onPress={() => setSelectedTags(selectedTags.filter((item) => item !== tag))}
        >
          <Text style={styles.tagText}>{tag}</Text>
          <Icon name="x" size={17} color={colors.navy} />
        </Pressable>
      ))}
      <Pressable
        accessibilityRole="button"
        style={styles.clearAllButton}
        onPress={() => setSelectedTags([])}
      >
        <Text style={styles.clearAllText}>Clear all</Text>
      </Pressable>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.chip,
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 8,
    gap: 8,
  },
  tagText: { color: colors.navy, fontSize: 13, fontWeight: "500" },
  clearAllButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.chip,
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  clearAllText: { color: colors.navy, fontSize: 13, fontWeight: "500" },
});
