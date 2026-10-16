import type { ComponentProps } from "react";
import { Pressable, Text, View } from "react-native";
import { House, List, Paintbrush, Sparkles, Film } from "lucide-react-native";
import type { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { font } from "../../theme/typography";
import { PatternPlaybackBar } from "../playback/PatternPlaybackBar";
import { usePreview } from "./usePreview";

type IBottomTabs = Parameters<NonNullable<ComponentProps<typeof Tabs>["tabBar"]>>[0];
const icons = {
  index: House,
  presets: List,
  playground: Paintbrush,
  demos: Sparkles,
  preview: Film,
};
function tabIcon(name: string) {
  return Object.hasOwn(icons, name)
    ? (Object.entries(icons).find(([key]) => key === name)?.[1] ?? House)
    : House;
}
export function BottomTabs(props: IBottomTabs) {
  const { state, navigation, descriptors } = props;
  const { t, fullscreen } = usePreview();
  const insets = useSafeAreaInsets();
  if (fullscreen) return null;
  return (
    <View style={{ backgroundColor: t.bg }}>
      <PatternPlaybackBar />
      <View
        accessibilityRole="tablist"
        style={{
          flexDirection: "row",
          backgroundColor: t.panel,
          borderTopWidth: 1,
          borderTopColor: t.line,
          paddingTop: 6,
          paddingBottom: Math.max(6, insets.bottom),
        }}
      >
        {state.routes.map((route, index) => {
          const selected = state.index === index;
          const Icon = tabIcon(route.name);
          const label = descriptors[route.key].options.title ?? route.name;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityLabel={label}
              accessibilityState={{ selected }}
              onPress={() => {
                const event = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!selected && !event.defaultPrevented)
                  navigation.navigate(route.name, route.params);
              }}
              style={{
                flex: 1,
                minHeight: 50,
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
              }}
            >
              <Icon
                size={24}
                color={selected ? t.fg : t.highlight}
                strokeWidth={selected ? 2.2 : 1.8}
              />
              <Text
                style={{
                  color: selected ? t.fg : t.fg2,
                  fontFamily: selected ? font.semibold : font.medium,
                  fontSize: 10,
                }}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
