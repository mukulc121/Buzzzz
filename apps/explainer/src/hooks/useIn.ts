import { spring, useCurrentFrame, useVideoConfig } from "remotion";

/** 0→1 entrance progress, starting at `delay` frames. */
export function useIn(delay = 0, damping = 200) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping } });
}
