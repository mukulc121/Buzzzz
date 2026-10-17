import type { IRiveConfig } from "@buzzzz/core";
import { isRivePreviewPath } from "../preview/routes";

interface INativeSound {
  preference: boolean;
  pathname: string;
  playing: boolean;
  riveConfig?: Pick<IRiveConfig, "nativeSound">;
}

export function deriveNativeSound(options: INativeSound) {
  const { preference, pathname, playing, riveConfig } = options;
  return isRivePreviewPath(pathname) && playing
    ? (riveConfig?.nativeSound ?? preference)
    : preference;
}
