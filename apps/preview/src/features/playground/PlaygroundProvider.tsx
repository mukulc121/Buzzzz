import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { Platform } from "react-native";
import { Settings } from "react-native-pulsar";
import { PlaygroundContext } from "./PlaygroundContext";
import { createPlaygroundStore } from "./playgroundStore";

interface IPlaygroundProvider {
  children: ReactNode;
}

export function PlaygroundProvider(props: IPlaygroundProvider) {
  const [store] = useState(createPlaygroundStore);
  const [hydrated, setHydrated] = useState(false);
  const preferences = useSyncExternalStore(store.subscribe, store.snapshot);
  useEffect(() => {
    let active = true;
    void store
      .load()
      .catch(() => {})
      .finally(() => {
        if (active) setHydrated(true);
      });
    return () => {
      active = false;
    };
  }, [store]);
  useEffect(() => {
    if (hydrated && Platform.OS === "android")
      Settings.setRealtimeComposerStrategy(preferences.strategy);
  }, [hydrated, preferences.strategy]);
  return <PlaygroundContext.Provider value={store}>{props.children}</PlaygroundContext.Provider>;
}
