import { useDeferredValue, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link } from "expo-router";
import Animated, { useAnimatedRef, useAnimatedScrollHandler } from "react-native-reanimated";
import { HapticSupport, Settings } from "react-native-pulsar";
import { scheduleOnRN } from "react-native-worklets";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { Icon } from "../../components/Icon";
import { ThemedText } from "../../components/ThemedText";
import { TAB_CONTENT_INSET, TabHeader } from "../../components/TabHeader";
import { colors } from "../../theme/colors";
import { margins } from "../../theme/margins";
import { useFilters } from "./useFilters";
import { PresetCard } from "./PresetCard";
import type { IPresetConfig } from "./presetsConfig";
import { searchPresets } from "./filterPresets";
import { SelectedTags } from "./SelectedTags";
import { useFilteredPresets } from "./useFilteredPresets";

function supportLevelName(level: HapticSupport) {
  if (level === HapticSupport.ADVANCED_SUPPORT) return "Advanced";
  if (level === HapticSupport.STANDARD_SUPPORT) return "Standard";
  if (level === HapticSupport.LIMITED_SUPPORT) return "Limited";
  return "None";
}
interface IEmptyState {
  title: string;
  hint: string;
}
function EmptyState(props: IEmptyState) {
  const { title, hint } = props;
  return (
    <Card>
      <ThemedText type="subtitle">{title}</ThemedText>
      <ThemedText>{hint}</ThemedText>
    </Card>
  );
}
function emptyState(query: string, favouritesOnly: boolean, tagCount: number) {
  if (query.trim())
    return (
      <EmptyState
        title="No presets found 😕"
        hint="Try a different search term or clear the search."
      />
    );
  if (favouritesOnly)
    return (
      <EmptyState
        title="No favorite presets 😕"
        hint="Tap the heart icon on a preset to add it to your favorites."
      />
    );
  if (tagCount > 0)
    return (
      <EmptyState
        title="No presets for selected tags 😕"
        hint="Try adjusting your filters to see more presets."
      />
    );
  return null;
}
const keyExtractor = (preset: IPresetConfig, index: number) => `${preset.name}-${index}`;
export function PresetsScreen() {
  const { filteredPresets, selectedTags, showFavouritesOnly } = useFilteredPresets();
  const { compactLayout } = useFilters();
  const [query, setQuery] = useState("");
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const deferredQuery = useDeferredValue(query);
  const listRef = useAnimatedRef<Animated.FlatList<IPresetConfig>>();
  const [supportLevel] = useState(() => supportLevelName(Settings.getHapticsSupportLevel()));
  const onScroll = useAnimatedScrollHandler<{ isVisible?: boolean }>({
    onScroll: (event, context) => {
      const shouldShow = event.contentOffset.y > 500;
      if (context.isVisible !== shouldShow) {
        context.isVisible = shouldShow;
        scheduleOnRN(setShowScrollToTop, shouldShow);
      }
    },
  });
  const presets = deferredQuery.trim()
    ? searchPresets(filteredPresets, deferredQuery)
    : filteredPresets;
  const header = (
    <>
      <TabHeader title="Get to know Pulsar presets">
        <ThemedText>
          Do not spend time creating your own patterns. Just use ours and enjoy the benefits of
          having haptics in your app by using presets.
        </ThemedText>
      </TabHeader>
      <ThemedText style={[margins.marginTop2X, styles.hapticsSupportInfo]}>
        Haptic support level: {supportLevel}
      </ThemedText>
      <Link href="/tagsModal" style={margins.marginTop4X}>
        <Link.Trigger>
          <View style={styles.learnMoreContainer}>
            <Text style={styles.learnMore}>Learn more about tags</Text>
            <Icon name="info" size={22} color={colors.navy} style={styles.infoIcon} />
          </View>
        </Link.Trigger>
      </Link>
      <View style={[styles.presetsTitleContainer, margins.marginTop4X]}>
        <ThemedText type="subtitle">Presets</ThemedText>
        <Link href="/filtersModal" accessibilityLabel="Filters">
          <Link.Trigger>
            <Icon name="sliders" size={25} color={colors.navy} style={styles.settingsIcon} />
          </Link.Trigger>
        </Link>
      </View>
      <View style={styles.searchContainer}>
        <TextInput
          accessibilityLabel="Search presets"
          style={styles.searchInput}
          placeholder="Search presets..."
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
        />
        {query.length > 0 && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            style={styles.searchClear}
            onPress={() => setQuery("")}
          >
            <Icon name="x" size={16} color={colors.navy} />
          </Pressable>
        )}
      </View>
      <SelectedTags />
    </>
  );
  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safeArea}>
      <View style={styles.container}>
        <Animated.FlatList
          ref={listRef}
          data={presets}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.contentContainer}
          ListHeaderComponent={header}
          ListEmptyComponent={emptyState(deferredQuery, showFavouritesOnly, selectedTags.length)}
          renderItem={({ item }) => <PresetCard preset={item} compact={compactLayout} />}
          ItemSeparatorComponent={() => <View style={{ height: compactLayout ? 12 : 30 }} />}
          onScroll={onScroll}
          scrollEventThrottle={16}
        />
        {showScrollToTop && (
          <Button
            accessibilityLabel="Scroll to top"
            onClick={() => listRef.current?.scrollToOffset({ offset: 0, animated: true })}
            showIcon="arrow"
            largeIcon
            disableHaptics
            style={styles.scrollToTopButton}
            iconStyle={styles.scrollToTopIcon}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1 },
  contentContainer: { paddingHorizontal: TAB_CONTENT_INSET, paddingBottom: 50 },
  learnMore: { color: colors.navy, fontSize: 16 },
  infoIcon: { marginLeft: 8 },
  learnMoreContainer: { flexDirection: "row", alignItems: "center" },
  presetsTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  settingsIcon: { marginTop: 20 },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 4,
    borderColor: colors.search,
    borderWidth: 2,
    backgroundColor: colors.white,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.navy,
    fontSize: 16,
  },
  searchClear: { padding: 10 },
  hapticsSupportInfo: { fontSize: 13, color: colors.blue },
  scrollToTopButton: {
    position: "absolute",
    width: 52,
    height: 52,
    paddingHorizontal: 0,
    paddingVertical: 0,
    bottom: 20,
    right: 20,
  },
  scrollToTopIcon: {
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "-90deg" }],
  },
});
