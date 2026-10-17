import { useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Button } from "../../components/Button";
import { Icon } from "../../components/Icon";
import { ThemedText } from "../../components/ThemedText";
import { colors } from "../../theme/colors";
import { useFilters } from "./useFilters";
import { TagsInfo } from "./tags";

const SYSTEM_PRESET_TAGS = ["Effect", "Primitive", "Vendor", "iOS Fallback"];
const trackColor = { false: colors.trackOff, true: colors.checked };
type IDraft = Record<string, Record<string, boolean>>;
function draftFrom(selected: string[]): IDraft {
  return Object.fromEntries(
    TagsInfo.map((group) => [
      group.groupName,
      Object.fromEntries(group.tags.map((tag) => [tag.name, selected.includes(tag.name)])),
    ]),
  );
}
interface ICheckboxItem {
  label: string;
  checked: boolean;
  onToggle: () => void;
}
function CheckboxItem(props: ICheckboxItem) {
  const { label, checked, onToggle } = props;
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      style={styles.checkboxContainer}
      onPress={onToggle}
    >
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked && <Icon name="check" size={16} color={colors.navy} />}
      </View>
      <Text style={styles.checkboxLabel}>{label}</Text>
    </Pressable>
  );
}
interface ISwitchRow {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  testID: string;
  first?: boolean;
}
function SwitchRow(props: ISwitchRow) {
  const { label, value, onValueChange, testID, first } = props;
  return (
    <View style={[styles.soundToggleRow, !first && styles.marginTop]}>
      <Text style={styles.checkboxLabel}>{label}</Text>
      <Switch
        testID={testID}
        value={value}
        onValueChange={onValueChange}
        trackColor={trackColor}
        thumbColor={value ? colors.blue : colors.thumbOff}
      />
    </View>
  );
}
export function FiltersModal() {
  const filters = useFilters();
  const [draft, setDraft] = useState(() => draftFrom(filters.selectedTags));
  const toggle = (group: string, tag: string) =>
    setDraft((current) => ({
      ...current,
      [group]: { ...current[group], [tag]: !current[group]?.[tag] },
    }));
  const toggleSystemPresetTag = (tag: string) =>
    filters.setSelectedSystemPresetTags(
      filters.selectedSystemPresetTags.includes(tag)
        ? filters.selectedSystemPresetTags.filter((item) => item !== tag)
        : [...filters.selectedSystemPresetTags, tag],
    );
  const apply = () => {
    filters.setSelectedTags(
      Object.values(draft).flatMap((group) => Object.keys(group).filter((tag) => group[tag])),
    );
    router.back();
  };
  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={() => router.back()}
            style={styles.closeButton}
          >
            <Icon name="x" size={30} color={colors.navy} />
          </Pressable>
          <ThemedText style={styles.title}>Filters</ThemedText>
          <Pressable accessibilityRole="button" onPress={() => setDraft(draftFrom([]))}>
            <Text style={styles.clearAll}>Clear all</Text>
          </Pressable>
        </View>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator>
          <View style={styles.soundToggleSection}>
            <ThemedText style={styles.sectionTitle}>Settings</ThemedText>
            <SwitchRow
              first
              label="Sound"
              testID="filters-sound-switch"
              value={filters.soundEnabled}
              onValueChange={filters.setSoundEnabled}
            />
            <SwitchRow
              label="Compact layout"
              testID="filters-compact-layout-switch"
              value={filters.compactLayout}
              onValueChange={filters.setCompactLayout}
            />
            <SwitchRow
              label="Show favorites only"
              testID="filters-favourites-only-switch"
              value={filters.showFavouritesOnly}
              onValueChange={filters.setShowFavouritesOnly}
            />
          </View>
          <View style={styles.soundToggleSection}>
            <ThemedText style={styles.sectionTitle}>System Presets</ThemedText>
            <SwitchRow
              label="Enable system presets"
              testID="filters-system-presets-switch"
              value={filters.showSystemPresets}
              onValueChange={filters.setShowSystemPresets}
            />
            {Platform.OS === "android" && filters.showSystemPresets && (
              <View style={styles.systemPresetTagsSection}>
                <View style={styles.optionsGrid}>
                  {SYSTEM_PRESET_TAGS.map((tag) => (
                    <CheckboxItem
                      key={tag}
                      label={tag}
                      checked={filters.selectedSystemPresetTags.includes(tag)}
                      onToggle={() => toggleSystemPresetTag(tag)}
                    />
                  ))}
                </View>
              </View>
            )}
          </View>
          {TagsInfo.map((group) => (
            <View key={group.groupName} style={styles.section}>
              <ThemedText style={styles.sectionTitle}>{group.groupName}</ThemedText>
              <View style={styles.optionsGrid}>
                {group.tags.map((tag) => (
                  <CheckboxItem
                    key={tag.name}
                    label={tag.name}
                    checked={Boolean(draft[group.groupName]?.[tag.name])}
                    onToggle={() => toggle(group.groupName, tag.name)}
                  />
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
        <View style={styles.footer}>
          <Button
            label="Show results"
            showIcon="arrow"
            onComplete={apply}
            style={styles.showResultsButton}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.white },
  container: { flex: 1, backgroundColor: colors.white },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 10,
    paddingRight: 20,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: colors.white,
  },
  closeButton: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 20, fontWeight: "600", color: colors.navy },
  clearAll: { fontSize: 18, color: colors.navy },
  scrollView: { flex: 1, paddingHorizontal: 20 },
  section: { marginTop: 10, marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: "600", color: colors.navy, marginBottom: 16 },
  optionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  checkboxContainer: { flexDirection: "row", alignItems: "center", width: "48%", marginBottom: 12 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.navy,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  checkboxChecked: { backgroundColor: colors.checked, borderColor: colors.navy },
  checkboxLabel: { fontSize: 16, color: colors.navy },
  footer: {
    padding: 20,
    paddingBottom: 40,
    backgroundColor: colors.white,
    boxShadow: `0px 20px 45px ${colors.search}`,
  },
  showResultsButton: { width: "100%" },
  soundToggleSection: { marginTop: 10, marginBottom: 20 },
  soundToggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  marginTop: { marginTop: 12 },
  systemPresetTagsSection: { marginTop: 16 },
});
