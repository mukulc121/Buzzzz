import { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "@pulsar_favourite_presets";
export function useFavouriteState() {
  const [favouritePresets, setFavouritePresets] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((value) => {
        const parsed: unknown = value ? JSON.parse(value) : [];
        if (Array.isArray(parsed)) setFavouritePresets(parsed.filter((n) => typeof n === "string"));
      })
      .catch(console.error)
      .finally(() => setLoaded(true));
  }, []);
  useEffect(() => {
    if (loaded) AsyncStorage.setItem(KEY, JSON.stringify(favouritePresets)).catch(console.error);
  }, [favouritePresets, loaded]);
  const toggleFavourite = (name: string) =>
    setFavouritePresets((current) =>
      current.includes(name) ? current.filter((item) => item !== name) : [...current, name],
    );
  const isFavourite = (name: string) => favouritePresets.includes(name);
  return { favouritePresets, toggleFavourite, isFavourite };
}
export const FavouritesContext = createContext<ReturnType<typeof useFavouriteState> | null>(null);
export function useFavourites() {
  const context = useContext(FavouritesContext);
  if (!context) throw new Error("useFavourites must be used within a FavouritesProvider");
  return context;
}
