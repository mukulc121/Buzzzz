import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { createRiveHaptics, type IRiveConfig, type TSystemImpact } from "@buzzzz/core";
import { riveHapticAction } from "./hapticAction";

interface IRiveHaptics {
  config: IRiveConfig | undefined;
  onImpact: (preset: TSystemImpact) => void;
  onComplete: () => void;
  onSuspend: () => void;
  fireTrigger: (name: string) => void;
  enabled: () => boolean;
}

export function useRiveHaptics(props: IRiveHaptics) {
  const { config } = props;
  const callbacks = useRef(props);
  useLayoutEffect(() => {
    callbacks.current = props;
  }, [props]);
  const controller = useRef<ReturnType<typeof createRiveHaptics> | null>(null);
  const paused = useRef(false);
  useLayoutEffect(() => {
    const script = createRiveHaptics({
      play: (preset) => callbacks.current.onImpact(preset),
      canPlay: () => document.visibilityState === "visible" && callbacks.current.enabled(),
      schedule: (action, delayMs) => setTimeout(action, delayMs),
      cancel: (timer) => clearTimeout(timer),
      completion: config?.completion,
      onComplete: () => callbacks.current.onComplete(),
      fireTrigger: (name) => callbacks.current.fireTrigger(name),
    });
    paused.current = false;
    controller.current = script;
    return () => {
      script.stop();
      if (controller.current === script) controller.current = null;
    };
  }, [config]);
  const stop = useCallback(() => {
    paused.current = false;
    controller.current?.stop();
  }, []);
  const mount = useCallback(() => controller.current?.mount(), []);
  const bind = useCallback(() => controller.current?.bind(), []);
  const elapsedMs = useCallback(() => controller.current?.elapsedMs() ?? null, []);
  const pause = useCallback(() => {
    paused.current = true;
    controller.current?.pause();
  }, []);
  const resume = useCallback(() => {
    paused.current = false;
    controller.current?.resume();
  }, []);
  useEffect(() => {
    const suspend = () => {
      if (!paused.current) callbacks.current.onSuspend();
    };
    const hide = () => {
      if (document.visibilityState !== "visible") suspend();
    };
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("pagehide", suspend);
    return () => {
      document.removeEventListener("visibilitychange", hide);
      window.removeEventListener("pagehide", suspend);
      stop();
    };
  }, [stop]);
  const fire = useCallback(
    (name: string) => {
      const action = riveHapticAction(config?.haptics, name);
      const script = controller.current;
      script?.trigger(name, action);
      return action !== undefined || script?.completed() === true;
    },
    [config],
  );
  return { fire, stop, pause, resume, mount, bind, elapsedMs };
}
