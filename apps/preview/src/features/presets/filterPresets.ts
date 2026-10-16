import { TagsInfo } from "./tags";

interface IPresetMetadata {
  name: string;
  description: string;
  tags: readonly string[];
}
interface IPresetSelection {
  selectedTags: string[];
  showSystemPresets: boolean;
  selectedSystemPresetTags: string[];
  showFavouritesOnly: boolean;
}
interface IPresetCatalogs<T> {
  standard: readonly T[];
  ios: readonly T[];
  android: readonly T[];
}
export const INITIAL_FILTERS: IPresetSelection & { soundEnabled: boolean; compactLayout: boolean } =
  {
    selectedTags: [],
    soundEnabled: true,
    showSystemPresets: false,
    selectedSystemPresetTags: ["Effect", "Primitive"],
    compactLayout: false,
    showFavouritesOnly: false,
  };

// Tags combine with OR inside a group and AND across groups.
export function filterPresets<T extends IPresetMetadata>(
  presets: readonly T[],
  selectedTags: readonly string[],
) {
  const groups: Record<string, string[]> = {};
  for (const tag of selectedTags)
    for (const group of TagsInfo)
      if (group.tags.some((t) => t.name === tag)) (groups[group.groupName] ??= []).push(tag);
  return presets.filter((preset) =>
    Object.values(groups).every((tags) => tags.some((tag) => preset.tags.includes(tag))),
  );
}
export function searchPresets<T extends IPresetMetadata>(presets: readonly T[], query: string) {
  const needle = query.toLowerCase();
  return presets.filter(
    (preset) =>
      preset.name.toLowerCase().includes(needle) ||
      preset.description.toLowerCase().includes(needle) ||
      preset.tags.some((tag) => tag.toLowerCase().includes(needle)),
  );
}

export function selectPresets<T extends IPresetMetadata>(
  catalogs: IPresetCatalogs<T>,
  platform: string,
  filters: IPresetSelection,
  favourites: readonly string[],
) {
  const system =
    platform === "ios"
      ? catalogs.ios
      : catalogs.android.filter((preset) =>
          filters.selectedSystemPresetTags.some((tag) => preset.tags.includes(tag)),
        );
  const tagged = filterPresets(
    filters.showSystemPresets ? system : catalogs.standard,
    filters.selectedTags,
  );
  return filters.showFavouritesOnly
    ? tagged.filter((preset) => favourites.includes(preset.name))
    : tagged;
}
