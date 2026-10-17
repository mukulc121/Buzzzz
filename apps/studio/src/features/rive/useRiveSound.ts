import { useCallback, useEffect, useRef } from "react";
import type { TRiveCue, TSystemImpact } from "@buzzzz/core";
import { riveCuePattern } from "@buzzzz/core/presets";
import { playBuffer, prepareSound, stopSound } from "../composer/audio";

export function useRiveSound() {
  const enabled = useRef(false);
  const generation = useRef(0);
  const owner = useRef({ current: () => generation.current++ });
  const stop = useCallback(() => {
    generation.current++;
    stopSound(owner.current);
  }, []);
  const impact = useCallback((cue: TSystemImpact | TRiveCue) => {
    if (!enabled.current) return;
    const pattern = riveCuePattern(typeof cue === "string" ? { delayMs: 0, preset: cue } : cue);
    if (!pattern) return;
    const token = ++generation.current;
    void prepareSound(pattern)
      .then((buffer) => {
        if (token === generation.current && enabled.current) playBuffer(buffer, 0, owner.current);
      })
      .catch(() => {});
  }, []);
  const setEnabled = useCallback(
    (value: boolean) => {
      enabled.current = value;
      if (!value) stop();
    },
    [stop],
  );
  const isEnabled = useCallback(() => enabled.current, []);
  useEffect(() => stop, [stop]);
  return { impact, stop, setEnabled, isEnabled };
}
