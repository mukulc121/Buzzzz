import { AppState } from "react-native";
import { useCallback, useEffect, useState } from "react";
import { usePatternComposer } from "react-native-pulsar";
import { patternEnd, type Pattern } from "@buzzzz/core";

interface INativePattern {
  name: string;
  pattern: Pattern;
  startedAt: number | null;
}
export function useNativePlayback() {
  const { stop, parse, play } = usePatternComposer();
  const [current, setCurrent] = useState<INativePattern | null>(null);
  const playPattern = useCallback(
    (pattern: Pattern, name = "Pattern", showPlayer = true) => {
      stop();
      parse(pattern);
      play();
      setCurrent(showPlayer ? { pattern, name, startedAt: Date.now() } : null);
    },
    [stop, parse, play],
  );
  const stopPattern = () => {
    stop();
    setCurrent((value) => value && { ...value, startedAt: null });
  };
  const dismiss = () => {
    stop();
    setCurrent(null);
  };
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") {
        stop();
        setCurrent((value) => value && { ...value, startedAt: null });
      }
    });
    return () => sub.remove();
  }, [stop]);
  const replay = () => {
    if (current) playPattern(current.pattern, current.name);
  };
  useEffect(() => {
    if (!current?.startedAt) return;
    const timer = setTimeout(
      () => setCurrent((value) => (value === current ? { ...current, startedAt: null } : value)),
      Math.max(30, patternEnd(current.pattern)),
    );
    return () => clearTimeout(timer);
  }, [current]);
  return { current, playPattern, stopPattern, dismiss, replay };
}
