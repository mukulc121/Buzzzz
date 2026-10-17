import { useLayoutEffect } from "react";
import { Settings } from "react-native-pulsar";
import { deriveNativeSound } from "./nativeSound";

export function useNativeSound(options: Parameters<typeof deriveNativeSound>[0]) {
  const enabled = deriveNativeSound(options);
  useLayoutEffect(() => Settings.enableSound(enabled), [enabled]);
}
