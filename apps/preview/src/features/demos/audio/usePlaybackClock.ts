import { useEffect, useRef, useState } from "react";

// JS mirror of the native preset clock so the scrubber can follow playback.
export function usePlaybackClock(durationMs: number) {
  const [positionMs, setPositionMs] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const frame = useRef<number | null>(null);
  const cancel = () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
  };
  const start = (fromMs: number) => {
    cancel();
    const startedAt = Date.now() - fromMs;
    setPositionMs(fromMs);
    setIsRunning(true);
    const tick = () => {
      const elapsed = Date.now() - startedAt;
      if (elapsed < durationMs) {
        setPositionMs(elapsed);
        frame.current = requestAnimationFrame(tick);
        return;
      }
      frame.current = null;
      setPositionMs(durationMs);
      setIsRunning(false);
    };
    frame.current = requestAnimationFrame(tick);
  };
  const stop = () => {
    cancel();
    setIsRunning(false);
  };
  const jumpTo = (ms: number) => {
    cancel();
    setIsRunning(false);
    setPositionMs(Math.max(0, Math.min(ms, durationMs)));
  };
  useEffect(() => cancel, []);
  return { positionMs, isRunning, start, stop, jumpTo };
}
