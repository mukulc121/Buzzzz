import { expect, test } from "bun:test";
import { createPlaygroundStore } from "../src/features/playground/playgroundStore";

test("first-run tutorial stays active until a swipe completes, and resetting it persists", async () => {
  const values = new Map<string, string>();
  const adapter = {
    getItem: async (key: string) => values.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      values.set(key, value);
    },
  };
  const store = createPlaygroundStore(adapter);
  await store.load();
  expect(store.snapshot()).toEqual({ onboarding: 1, strategy: 3 });
  await store.setOnboarding(2);
  expect(values.has("@pulsar_onboarding_completed")).toBe(false);
  await store.setOnboarding(3);
  const restored = createPlaygroundStore(adapter);
  await restored.load();
  expect(restored.snapshot().onboarding).toBe(3);
  await restored.setOnboarding(1);
  const reset = createPlaygroundStore(adapter);
  await reset.load();
  expect(reset.snapshot().onboarding).toBe(1);
});

test("Android strategy selection survives restart while invalid saved numbers use the published default", async () => {
  const values = new Map([["@pulsar_playground_strategy", "999"]]);
  const adapter = {
    getItem: async (key: string) => values.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      values.set(key, value);
    },
  };
  const store = createPlaygroundStore(adapter);
  await store.load();
  expect(store.snapshot().strategy).toBe(3);
  await store.setStrategy(0);
  const restored = createPlaygroundStore(adapter);
  await restored.load();
  expect(restored.snapshot().strategy).toBe(0);
});

test("late preference hydration cannot undo a tutorial tap or lose the independent saved strategy", async () => {
  let resolveRead: (value: string | null) => void = () => {};
  const store = createPlaygroundStore({
    getItem: (key) =>
      key === "@pulsar_onboarding_completed"
        ? new Promise((resolve) => {
            resolveRead = resolve;
          })
        : Promise.resolve("1"),
    setItem: async () => {},
  });
  const loading = store.load();
  await store.setOnboarding(2);
  resolveRead("true");
  await loading;
  expect(store.snapshot()).toEqual({ onboarding: 2, strategy: 1 });
});
