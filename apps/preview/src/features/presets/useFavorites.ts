import { useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "buzzzz-favorite-presets";
export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const pending = useRef(Promise.resolve());
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(KEY)
      .then((text) => {
        if (!active) return;
        const value: unknown = text ? JSON.parse(text) : [];
        if (
          !Array.isArray(value) ||
          !value.every((item): item is string => typeof item === "string")
        )
          throw new Error("Invalid favorites");
        setFavorites(value);
        setLoaded(true);
      })
      .catch(() => {
        if (active) {
          setError("Favorites could not be loaded.");
        }
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!loaded) return;
    pending.current = pending.current
      .then(() => AsyncStorage.setItem(KEY, JSON.stringify(favorites)))
      .catch(() => setError("Favorites could not be saved."));
  }, [favorites, loaded]);
  const toggle = (name: string) => {
    if (loaded)
      setFavorites((current) =>
        current.includes(name) ? current.filter((item) => item !== name) : [...current, name],
      );
  };
  const reset = () => {
    setError(null);
    void AsyncStorage.setItem(KEY, "[]")
      .then(() => {
        setFavorites([]);
        setLoaded(true);
      })
      .catch(() => setError("Favorites could not be reset. Try again."));
  };
  return { favorites, toggle, error, reset, canReset: Boolean(error && !loaded) };
}
