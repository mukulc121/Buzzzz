import { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { INITIAL_FILTERS } from "./filterPresets";

const COMPACT_KEY = "@pulsar_compact_layout";
export function useFilterState() {
  const [selectedTags, setSelectedTags] = useState(INITIAL_FILTERS.selectedTags);
  const [soundEnabled, setSoundEnabled] = useState(INITIAL_FILTERS.soundEnabled);
  const [showSystemPresets, setShowSystemPresets] = useState(INITIAL_FILTERS.showSystemPresets);
  const [selectedSystemPresetTags, setSelectedSystemPresetTags] = useState(
    INITIAL_FILTERS.selectedSystemPresetTags,
  );
  const [compactLayout, setCompactLayout] = useState(INITIAL_FILTERS.compactLayout);
  const [showFavouritesOnly, setShowFavouritesOnly] = useState(INITIAL_FILTERS.showFavouritesOnly);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem(COMPACT_KEY)
      .then((value) => setCompactLayout(value === "true"))
      .catch(console.error)
      .finally(() => setLoaded(true));
  }, []);
  useEffect(() => {
    if (loaded)
      AsyncStorage.setItem(COMPACT_KEY, compactLayout ? "true" : "false").catch(console.error);
  }, [compactLayout, loaded]);
  return {
    selectedTags,
    setSelectedTags,
    soundEnabled,
    setSoundEnabled,
    showSystemPresets,
    setShowSystemPresets,
    selectedSystemPresetTags,
    setSelectedSystemPresetTags,
    compactLayout,
    setCompactLayout,
    showFavouritesOnly,
    setShowFavouritesOnly,
  };
}
export const FilterContext = createContext<ReturnType<typeof useFilterState> | null>(null);
export function useFilters() {
  const context = useContext(FilterContext);
  if (!context) throw new Error("useFilters must be used within a FilterProvider");
  return context;
}
