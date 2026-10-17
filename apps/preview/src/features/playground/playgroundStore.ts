import AsyncStorage from "@react-native-async-storage/async-storage";

interface IPlaygroundPreferences {
  onboarding: 1 | 2 | 3;
  strategy: 0 | 1 | 2 | 3;
}

export function createPlaygroundStore(
  adapter: Pick<typeof AsyncStorage, "getItem" | "setItem"> = AsyncStorage,
) {
  let state: IPlaygroundPreferences = { onboarding: 1, strategy: 3 };
  let loaded: Promise<void> | null = null;
  let writes = Promise.resolve();
  let onboardingRevision = 0;
  let strategyRevision = 0;
  const listeners = new Set<() => void>();
  const update = (next: IPlaygroundPreferences) => {
    state = next;
    for (const listener of listeners) listener();
  };
  const persist = (key: string, value: string) => {
    writes = writes.catch(() => {}).then(() => adapter.setItem(key, value));
    return writes;
  };
  return {
    snapshot: () => state,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    load: () => {
      if (!loaded) {
        const onboardingStarted = onboardingRevision;
        const strategyStarted = strategyRevision;
        loaded = Promise.all([
          adapter.getItem("@pulsar_onboarding_completed"),
          adapter.getItem("@pulsar_playground_strategy"),
        ]).then(([completed, strategy]) => {
          const value = Number(strategy);
          update({
            onboarding:
              onboardingRevision === onboardingStarted
                ? completed === "true"
                  ? 3
                  : 1
                : state.onboarding,
            strategy:
              strategyRevision !== strategyStarted
                ? state.strategy
                : strategy !== null && (value === 0 || value === 1 || value === 2 || value === 3)
                  ? value
                  : 3,
          });
        });
      }
      return loaded;
    },
    setOnboarding: (onboarding: IPlaygroundPreferences["onboarding"]) => {
      onboardingRevision++;
      update({ ...state, onboarding });
      if (onboarding === 3 || onboarding === 1)
        return persist("@pulsar_onboarding_completed", String(onboarding === 3));
      return Promise.resolve();
    },
    setStrategy: (strategy: IPlaygroundPreferences["strategy"]) => {
      strategyRevision++;
      update({ ...state, strategy });
      return persist("@pulsar_playground_strategy", String(strategy));
    },
  };
}
