import { useEffect, useMemo } from "react";
import { AppState } from "react-native";
import { createRiveHaptics, type IRiveConfig } from "@buzzzz/core";
import { Presets } from "react-native-pulsar";
import { playSystemImpact } from "./systemImpact";

interface IRiveHaptics {
  completion: IRiveConfig["completion"];
  onComplete: () => void;
  fireTrigger: (name: string) => void;
}

function createNativeRiveHaptics(options: IRiveHaptics) {
  let enabled = false;
  const haptics = createRiveHaptics({
    ...options,
    play: (preset) => playSystemImpact(preset, Presets.System),
    canPlay: () => enabled && AppState.currentState === "active",
    schedule: (callback, delayMs) => setTimeout(callback, delayMs),
    cancel: (timer) => clearTimeout(timer),
  });
  return {
    ...haptics,
    setEnabled: (value: boolean) => {
      enabled = value;
      if (value) haptics.resume();
      else haptics.pause();
    },
  };
}

export function useRiveHaptics(options: IRiveHaptics) {
  const { completion, onComplete, fireTrigger } = options;
  const player = useMemo(
    () => createNativeRiveHaptics({ completion, onComplete, fireTrigger }),
    [completion, onComplete, fireTrigger],
  );
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") player.stop();
    });
    return () => {
      subscription.remove();
      player.stop();
    };
  }, [player]);
  return player;
}
