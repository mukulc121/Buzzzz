import { OutlineButton } from "../../components/OutlineButton";
import { useMemo, useState } from "react";
import { FlatList, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SlidersHorizontal } from "lucide-react-native";
import { pulsarPresets } from "@buzzzz/core/presets";
import { ScreenHeading } from "../../components/ScreenHeading";
import { PressableScale } from "../../components/PressableScale";
import { font } from "../../theme/typography";
import { usePreview } from "../shell/usePreview";
import { useFavorites } from "./useFavorites";
import { PresetCard } from "./PresetCard";

const presetKey = (preset: (typeof pulsarPresets)[number]) =>
  `${preset.name}:${preset.tags.join("/")}`;

export function PresetsScreen() {
  const { t, session } = usePreview();
  const [query, setQuery] = useState("");
  const [filtering, setFiltering] = useState(false);
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [tag, setTag] = useState<string | null>(null);
  const { favorites, toggle, error, reset, canReset } = useFavorites();
  const tags = useMemo(
    () => [...new Set(pulsarPresets.flatMap((preset) => preset.tags))].sort(),
    [],
  );
  const needle = query.trim().toLowerCase();
  const list = pulsarPresets.filter(
    (preset) =>
      (!favoriteOnly || favorites.includes(presetKey(preset))) &&
      (!tag || preset.tags.includes(tag)) &&
      [preset.name, preset.description, ...preset.tags].some((text) =>
        text.toLowerCase().includes(needle),
      ),
  );
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={["top", "left", "right"]}>
      <FlatList
        data={list}
        keyExtractor={presetKey}
        initialNumToRender={3}
        maxToRenderPerBatch={4}
        windowSize={5}
        contentContainerStyle={{ padding: 16, paddingBottom: 24, gap: 16 }}
        ListHeaderComponent={
          <View style={{ gap: 18 }}>
            <ScreenHeading
              title="Get to know Pulsar presets"
              subtitle="Try ready-made haptic patterns. Find a feeling, save your favorites and use them in Studio."
              t={t}
            />
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text
                accessibilityRole="header"
                style={{ fontFamily: font.bold, color: t.fg, fontSize: 22 }}
              >
                Presets · {list.length}
              </Text>
              <PressableScale
                onPress={() => setFiltering(!filtering)}
                accessibilityLabel="Filter presets"
                style={{
                  minHeight: 44,
                  minWidth: 44,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <SlidersHorizontal size={22} color={t.fg} />
              </PressableScale>
            </View>
            <TextInput
              accessibilityLabel="Search Pulsar presets"
              value={query}
              onChangeText={setQuery}
              placeholder="Search presets…"
              placeholderTextColor={t.muted}
              style={{
                borderWidth: 1,
                borderColor: t.highlight,
                borderRadius: 4,
                minHeight: 48,
                backgroundColor: t.panel,
                color: t.fg,
                fontFamily: font.regular,
                fontSize: 16,
                paddingHorizontal: 12,
              }}
            />
            {filtering && (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <PressableScale
                  onPress={() => setFavoriteOnly(!favoriteOnly)}
                  style={{
                    minHeight: 44,
                    padding: 12,
                    borderRadius: 4,
                    borderWidth: 1,
                    borderColor: t.highlight,
                    backgroundColor: favoriteOnly ? t.highlight : t.panel,
                  }}
                >
                  <Text style={{ color: t.fg, fontFamily: font.medium }}>Favorites</Text>
                </PressableScale>
                {tags.map((name) => (
                  <PressableScale
                    key={name}
                    onPress={() => setTag(tag === name ? null : name)}
                    style={{
                      minHeight: 44,
                      padding: 12,
                      borderRadius: 4,
                      borderWidth: 1,
                      borderColor: t.highlight,
                      backgroundColor: tag === name ? t.highlight : t.panel,
                    }}
                  >
                    <Text style={{ color: t.fg, fontFamily: font.medium }}>{name}</Text>
                  </PressableScale>
                ))}
              </View>
            )}
            {canReset && <OutlineButton title="Reset favorites" onPress={reset} t={t} />}
            {error && (
              <Text accessibilityRole="alert" style={{ color: t.err, fontFamily: font.regular }}>
                {error}
              </Text>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <PresetCard
            preset={item}
            favorite={favorites.includes(presetKey(item))}
            onFavorite={() => toggle(presetKey(item))}
            onPlay={() => session.playback.playPattern(item.pattern, item.name)}
            t={t}
          />
        )}
        ListEmptyComponent={
          <Text style={{ color: t.muted, fontFamily: font.regular, fontSize: 16 }}>
            No presets match your filters.
          </Text>
        }
      />
    </SafeAreaView>
  );
}
