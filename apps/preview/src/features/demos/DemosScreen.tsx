import { Link } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";
import { ThemedText } from "../../components/ThemedText";
import type { Theme } from "../../theme/colors";
import { DEMOS } from "./catalog";
import { DemoChevron } from "./index/DemoChevron";

interface IDemosScreen {
  t: Theme;
}
export function DemosScreen(props: IDemosScreen) {
  const { t } = props;
  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={styles.content}>
      <View style={styles.container}>
        <ThemedText type="title" style={styles.title}>
          Haptics demos
        </ThemedText>
        <ThemedText style={styles.subtitle}>Feel them with real use cases.</ThemedText>
        <View style={styles.list}>
          {DEMOS.map((demo) => (
            <Link
              key={demo.slug}
              href={`/demos/${demo.slug}`}
              style={styles.linkOverride}
              accessibilityLabel={demo.title}
            >
              <Link.Trigger>
                <View
                  style={StyleSheet.flatten([
                    styles.card,
                    {
                      backgroundColor: t.panel,
                      borderColor: t.highlight,
                      boxShadow: `-3px 3px 0px ${t.highlight}`,
                    },
                  ])}
                >
                  <ThemedText type="subtitle" style={styles.cardTitle}>
                    {demo.title}
                  </ThemedText>
                  <DemoChevron />
                </View>
              </Link.Trigger>
            </Link>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 24 },
  container: { paddingLeft: 15, paddingRight: 15 },
  title: { marginTop: 20 },
  subtitle: { marginTop: 10 },
  list: { marginTop: 20, gap: 12 },
  linkOverride: { overflow: undefined },
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
});
