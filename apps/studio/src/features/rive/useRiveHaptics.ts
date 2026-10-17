import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { createRiveHaptics, type IRiveConfig, type TSystemImpact } from "@buzzzz/core";
import { riveHapticAction } from "./hapticAction";

interface IRiveHaptics {
  config: IRiveConfig | undefined;
  onImpact: (preset: TSystemImpact) => void;
  onComplete: () => void;
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
    controller.current = script;
    return () => {
      script.stop();
      if (controller.current === script) controller.current = null;
    };
  }, [config]);
  const stop = useCallback(() => controller.current?.stop(), []);
  const pause = useCallback(() => controller.current?.pause(), []);
  const resume = useCallback(() => controller.current?.resume(), []);
  useEffect(() => {
    const hide = () => {
      if (document.visibilityState !== "visible") stop();
    };
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("pagehide", stop);
    return () => {
      document.removeEventListener("visibilitychange", hide);
      window.removeEventListener("pagehide", stop);
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
  return { fire, stop, pause, resume };
}
