import { Platform } from "react-native";
import { useFavourites } from "./useFavourites";
import { useFilters } from "./useFilters";
import { selectPresets } from "./filterPresets";
import { AndroidPresetsConfig, IOSPresetsConfig, PresetsConfig } from "./presetsConfig";

export function useFilteredPresets() {
  const filters = useFilters();
  const { favouritePresets } = useFavourites();
  const filteredPresets = selectPresets(
    { standard: PresetsConfig, ios: IOSPresetsConfig, android: AndroidPresetsConfig },
    Platform.OS,
    filters,
    favouritePresets,
  );
  return {
    filteredPresets,
    selectedTags: filters.selectedTags,
    showFavouritesOnly: filters.showFavouritesOnly,
  };
}
