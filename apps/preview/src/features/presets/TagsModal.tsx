import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Icon } from "../../components/Icon";
import { ThemedText } from "../../components/ThemedText";
import { colors } from "../../theme/colors";
import { TagsInfo } from "./tags";

interface ITagDescription {
  name: string;
  description: string;
  usage: string;
}
function TagDescription(props: ITagDescription) {
  const { name, description, usage } = props;
  return (
    <View style={styles.tagCard}>
      <View style={styles.tag}>
        <ThemedText style={styles.tagText}>{name}</ThemedText>
      </View>
      <ThemedText style={styles.description}>{description}</ThemedText>
      <ThemedText style={styles.usage}>Usage: {usage}</ThemedText>
    </View>
  );
}
export function TagsModal() {
  const [tab, setTab] = useState(0);
  const group = TagsInfo[tab];
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <ThemedText type="subtitle">Preset tags</ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={() => router.back()}
            style={styles.closeButton}
          >
            <Icon name="x" size={30} color={colors.navy} />
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsHeader}>
          {TagsInfo.map((item, index) => (
            <Pressable
              key={item.groupName}
              accessibilityRole="tab"
              accessibilityState={{ selected: index === tab }}
              onPress={() => setTab(index)}
              style={[
                styles.tabButton,
                {
                  backgroundColor: index === tab ? colors.tint : colors.white,
                  borderBottomColor: index === tab ? colors.border : colors.tag,
                },
              ]}
            >
              <ThemedText style={styles.tabText}>{item.groupName}</ThemedText>
            </Pressable>
          ))}
        </ScrollView>
        <ScrollView
          key={group?.groupName}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          {group?.tags.map((tag) => (
            <TagDescription key={tag.name} {...tag} />
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.white },
  container: { flex: 1, paddingTop: 10, backgroundColor: colors.white },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 5,
  },
  closeButton: { paddingTop: 8, paddingBottom: 8, paddingLeft: 12, paddingRight: 0 },
  tabsHeader: { flexGrow: 0 },
  tabButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 120,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 2,
  },
  tabText: { fontSize: 16 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 15 },
  tagCard: { padding: 20, borderRadius: 4, marginBottom: 16, backgroundColor: colors.tint },
  tag: {
    borderWidth: 2,
    borderRadius: 4,
    borderColor: colors.border,
    boxShadow: `-2px 2px 0px ${colors.border}`,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignSelf: "flex-start",
    marginBottom: 12,
  },
  tagText: { fontSize: 18, fontWeight: "500" },
  description: { fontSize: 16, lineHeight: 28, marginBottom: 12, fontWeight: "500" },
  usage: { lineHeight: 28 },
});
