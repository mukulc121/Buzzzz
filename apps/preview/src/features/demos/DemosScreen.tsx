import { Link } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { ThemedText } from "../../components/ThemedText";
import type { Theme } from "../../theme/colors";
import { DEMOS } from "./catalog";

interface IDemosScreen {
  t: Theme;
}
export function DemosScreen(props: IDemosScreen) {
  const { t } = props;
  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={styles.content}>
      <ThemedText type="title" style={styles.title}>
        Haptics demos
      </ThemedText>
      <ThemedText style={styles.subtitle}>Feel them with real use cases.</ThemedText>
      <View style={styles.list}>
        {DEMOS.map((demo) => (
          <Link key={demo.id} href={`/demos/${demo.slug}`} asChild>
            <Pressable
              style={StyleSheet.flatten([
                styles.card,
                {
                  backgroundColor: t.panel,
                  borderColor: t.highlight,
                  boxShadow: `-3px 3px 0px ${t.highlight}`,
                },
              ])}
              accessibilityRole="button"
              accessibilityLabel={demo.title}
            >
              <ThemedText type="subtitle" style={styles.cardTitle}>
                {demo.title}
              </ThemedText>
              <ChevronRight size={20} color={t.highlight} style={styles.arrow} />
            </Pressable>
          </Link>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 15, paddingBottom: 24 },
  title: { marginTop: 20 },
  subtitle: { marginTop: 10 },
  list: { marginTop: 20, gap: 12 },
  card: {
    borderRadius: 4,
    borderWidth: 2,
    padding: 15,
    paddingVertical: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: { fontSize: 20, lineHeight: 28, flex: 1 },
  arrow: { marginLeft: 8 },
});
