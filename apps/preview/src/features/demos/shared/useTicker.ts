import { useEffect, useRef, useState } from "react";
import { useAppBackground } from "./useAppBackground";

// A single interval that is always cleared on stop, unmount and app background.
export function useTicker(onBackground?: () => void) {
  const id = useRef<ReturnType<typeof setInterval> | null>(null);
  const [running, setRunning] = useState(false);
  const stop = () => {
    if (id.current) clearInterval(id.current);
    id.current = null;
    setRunning(false);
  };
  const start = (ms: number, tick: () => void) => {
    stop();
    id.current = setInterval(tick, ms);
    setRunning(true);
  };
  useAppBackground(() => {
    stop();
    onBackground?.();
  });
  useEffect(
    () => () => {
      if (id.current) clearInterval(id.current);
    },
    [],
  );
  return { start, stop, running };
}
