import { useEffect, useMemo } from "react";
import { AppState } from "react-native";
import { createRiveHaptics, type IRiveConfig, type TRiveCue } from "@buzzzz/core";
import { riveCuePattern } from "@buzzzz/core/presets";
import { Presets, Settings, usePatternComposer, type PatternComposer } from "react-native-pulsar";
import { playSystemImpact } from "./systemImpact";
import { playPulsarPreset, pulsarPresetNames } from "./pulsarPreset";

interface IRiveHaptics {
  completion: IRiveConfig["completion"];
  haptics: IRiveConfig["haptics"];
  onComplete: () => void;
  fireTrigger: (name: string) => void;
}

type TPulsarCue = Extract<TRiveCue, { pulsar: string }>;

type TComposer = Pick<PatternComposer, "parse" | "play" | "stop">;

function createNativeRiveHaptics(options: IRiveHaptics, composer: TComposer) {
  let enabled = false;
  let bound = false;
  let parsed: TPulsarCue | null = null;
  const stopPulsar = () => composer.stop();
  const haptics = createRiveHaptics({
    ...options,
    play: (preset) => playSystemImpact(preset, Presets.System),
    playPulsar: (cue) => {
      if (!cue.tuning) {
        playPulsarPreset(cue.pulsar);
        return;
      }
      if (parsed !== cue) {
        const pattern = riveCuePattern(cue);
        if (!pattern) return;
        composer.parse(pattern);
        parsed = cue;
      }
      composer.play();
    },
    stopPulsar,
    canPlay: () => enabled && AppState.currentState === "active",
    schedule: (callback, delayMs) => setTimeout(callback, delayMs),
    cancel: (timer) => clearTimeout(timer),
  });
  // Pausing the clock alone would let an in-flight pattern run on.
  const pause = () => {
    haptics.pause();
    stopPulsar();
    Settings.stopHaptics();
  };
  return {
    ...haptics,
    mount: () => {
      bound = false;
      haptics.mount();
      if (AppState.currentState !== "active") pause();
    },
    bind: (paused: boolean) => {
      bound = true;
      if (paused || AppState.currentState !== "active") pause();
      haptics.bind();
    },
    setAppActive: (active: boolean) => {
      if (active && enabled) haptics.resume();
      else pause();
    },
    setEnabled: (value: boolean) => {
      enabled = value;
      if (value && AppState.currentState === "active") haptics.resume();
      else if (bound) pause();
    },
  };
}

export function useRiveHaptics(options: IRiveHaptics) {
  const { completion, haptics, onComplete, fireTrigger } = options;
  const { parse, play, stop } = usePatternComposer();
  const player = useMemo(
    () =>
      createNativeRiveHaptics(
        { completion, haptics, onComplete, fireTrigger },
        { parse, play, stop },
      ),
    [completion, haptics, onComplete, fireTrigger, parse, play, stop],
  );
  useEffect(() => {
    const names = pulsarPresetNames(haptics);
    if (names.length) Settings.preloadPresets(names);
  }, [haptics]);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      player.setAppActive(state === "active");
    });
    return () => {
      subscription.remove();
      player.stop();
    };
  }, [player]);
  return player;
}
