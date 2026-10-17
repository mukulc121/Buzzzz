import { useContext, useSyncExternalStore } from "react";
import { PlaygroundContext } from "./PlaygroundContext";

export function usePlaygroundPreferences() {
  const store = useContext(PlaygroundContext);
  if (!store) throw new Error("PlaygroundProvider is missing.");
  const preferences = useSyncExternalStore(store.subscribe, store.snapshot);
  return { ...preferences, setOnboarding: store.setOnboarding, setStrategy: store.setStrategy };
}
