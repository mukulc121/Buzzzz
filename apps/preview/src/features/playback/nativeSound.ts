import type { IRiveConfig } from "@buzzzz/core";

interface INativeSound {
  preference: boolean;
  pathname: string;
  playing: boolean;
  riveConfig?: Pick<IRiveConfig, "nativeSound">;
}

export function deriveNativeSound(options: INativeSound) {
  const { preference, pathname, playing, riveConfig } = options;
  return pathname === "/preview" && playing ? (riveConfig?.nativeSound ?? preference) : preference;
}
