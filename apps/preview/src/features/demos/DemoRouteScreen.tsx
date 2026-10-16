import { ScrollView, StyleSheet, View } from "react-native";
import { ThemedText } from "../../components/ThemedText";
import type { Theme } from "../../theme/colors";
import { DEMOS, type DemoId } from "./catalog";
import { DemoDetail } from "./DemoDetail";

interface IDemoRouteScreen {
  id: DemoId;
  t: Theme;
}
const CONTENT_TITLES: Partial<Record<DemoId, string>> = {
  slider: "Slider haptics",
  balloon: "Popping balloons",
  dots: "Wavy Dot Loader",
  buttons: "Buttons haptics grid",
  countdown: "Countdown timer",
};
export function DemoRouteScreen(props: IDemoRouteScreen) {
  const { id, t } = props;
  if (id === "audio" || id === "lottie") return <DemoDetail id={id} t={t} />;
  const demo = DEMOS.find((entry) => entry.id === id);
  const title = CONTENT_TITLES[id] ?? demo?.headerTitle;
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.bg }}
      contentContainerStyle={[styles.content, { paddingBottom: id === "slider" ? 32 : 28 }]}
    >
      <View style={styles.body}>
        <ThemedText type="title" style={styles.title}>
          {title}
        </ThemedText>
        <DemoDetail id={id} t={t} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 15 },
  body: { gap: 10 },
  title: { marginTop: 20 },
});
