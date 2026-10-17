import { useCallback, useEffect, useRef } from "react";
import { useFocusEffect } from "expo-router";
import { useLongPressGesture } from "react-native-gesture-handler";
import { useRealtimeComposer } from "react-native-pulsar";
import {
  cancelAnimation,
  Easing,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import {
  BALLOON_FADE_MS,
  BALLOON_LONG_PRESS_MS,
  BALLOON_RELEASE_MS,
  BALLOON_RESET_MS,
  balloonFeedback,
  balloonImpulse,
  type BalloonProfile,
} from "./balloon";

export function useBalloonCell(profile: BalloonProfile) {
  const composer = useRealtimeComposer();
  const active = useSharedValue(false);
  const progress = useSharedValue(0);
  const opacity = useSharedValue(1);
  const poppedOpacity = useSharedValue(0);
  const shake = useSharedValue(0);
  const popped = useRef(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const { stop, set, playDiscrete } = composer;
  useFocusEffect(
    useCallback(() => {
      active.set(true);
      return () => {
        active.set(false);
        stop();
      };
    }, [active, stop]),
  );
  useEffect(() => () => clearTimeout(resetTimer.current), []);
  const pop = () => {
    if (popped.current) return;
    popped.current = true;
    cancelAnimation(shake);
    shake.set(withTiming(0, { duration: 50 }));
    opacity.set(withTiming(0, { duration: BALLOON_FADE_MS }));
    poppedOpacity.set(withTiming(1, { duration: BALLOON_FADE_MS }));
    clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => {
      progress.set(0);
      poppedOpacity.set(withTiming(0, { duration: 140 }));
      opacity.set(withTiming(1, { duration: 220 }));
      popped.current = false;
    }, BALLOON_RESET_MS);
  };
  useAnimatedReaction(
    () => ({ active: active.get(), progress: progress.get() }),
    (current, previous) => {
      for (const command of balloonFeedback(
        current.progress,
        previous?.progress ?? 0,
        current.active,
        profile,
      )) {
        switch (command.kind) {
          case "stop":
            stop();
            break;
          case "set":
            set(command.amplitude, command.frequency);
            break;
          case "discrete":
            playDiscrete(command.amplitude, command.frequency);
            break;
          case "pop":
            scheduleOnRN(pop);
            break;
          case "shakeStart":
            shake.set(
              withRepeat(
                withSequence(
                  withTiming(profile.shakeAmt, { duration: profile.shakeDur }),
                  withTiming(-profile.shakeAmt, { duration: profile.shakeDur }),
                ),
                -1,
                true,
              ),
            );
            break;
          case "shakeStop":
            cancelAnimation(shake);
            shake.set(withTiming(0, { duration: 50 }));
            break;
        }
      }
    },
  );
  useAnimatedReaction(
    () => ({ active: active.get(), offset: shake.get() }),
    (current, previous) => {
      if (!current.active) {
        stop();
        return;
      }
      const impulse = balloonImpulse(
        progress.get(),
        previous?.offset ?? 0,
        current.offset,
        profile,
      );
      if (impulse) playDiscrete(impulse.amplitude, impulse.frequency);
    },
  );
  const gesture = useLongPressGesture({
    minDuration: BALLOON_LONG_PRESS_MS,
    maxDistance: 10000,
    shouldCancelWhenOutside: false,
    runOnJS: true,
    onActivate: () => {
      if (popped.current) return;
      cancelAnimation(progress);
      progress.set(withTiming(1, { duration: profile.chargeMs, easing: Easing.out(Easing.cubic) }));
    },
    onFinalize: () => {
      if (popped.current) return;
      cancelAnimation(progress);
      progress.set(
        withTiming(0, { duration: BALLOON_RELEASE_MS, easing: Easing.out(Easing.quad) }),
      );
    },
  });
  const balloonStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: shake.get() },
      { scale: 1 + Math.max(0, Math.min(1, progress.get())) * 0.4 },
    ],
    opacity: opacity.get(),
  }));
  const poppedStyle = useAnimatedStyle(() => ({ opacity: poppedOpacity.get() }));
  return { gesture, balloonStyle, poppedStyle };
}
