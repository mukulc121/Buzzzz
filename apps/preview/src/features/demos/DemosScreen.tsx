import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import type { Theme } from "../../theme/colors";
import { DEMOS, type DemoId } from "./catalog";
import { DemoDetail } from "./DemoDetail";
import { demoColors, demoStyles } from "./shared/demoStyles";

interface IDemosScreen {
  t: Theme;
}
export function DemosScreen(props: IDemosScreen) {
  const { t } = props;
  const s = demoStyles(t);
  const [open, setOpen] = useState<DemoId | null>(null);
  useFocusEffect(useCallback(() => () => setOpen(null), []));
  const demo = DEMOS.find((d) => d.id === open);
  return (
    <ScrollView style={s.page} contentContainerStyle={s.content}>
      {demo ? (
        <>
          <Pressable style={s.back} onPress={() => setOpen(null)} accessibilityRole="button">
            <ChevronLeft size={20} color={t.fg2} />
            <Text style={s.backText}>Back to demos</Text>
          </Pressable>
          <Text style={s.title}>{demo.title}</Text>
          {/* key remounts the demo so every timer, sensor and composer is torn down on leave */}
          <DemoDetail key={demo.id} t={t} id={demo.id} />
        </>
      ) : (
        <>
          <Text style={s.title}>Demos</Text>
          {DEMOS.map((d) => (
            <Pressable
              key={d.id}
              style={({ pressed }) => [s.card, pressed && { opacity: 0.85 }]}
              onPress={() => setOpen(d.id)}
              accessibilityRole="button"
              accessibilityLabel={`${d.title}. ${d.blurb}`}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={s.cardTitle}>{d.title}</Text>
                  <Text style={s.muted}>{d.blurb}</Text>
                </View>
                <ChevronRight size={22} color={demoColors.cyan} />
              </View>
            </Pressable>
          ))}
        </>
      )}
    </ScrollView>
  );
}
