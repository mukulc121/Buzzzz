import type { IRiveConfig, TRiveHapticAction } from "@buzzzz/core";
import { DEX_RIVE_CONFIG } from "./dex-rive-config";

function actionKey(action: TRiveHapticAction | undefined) {
  if (!action) return undefined;
  return JSON.stringify(
    action.kind === "stop"
      ? [action.kind, action.trigger]
      : [
          action.kind,
          action.immediate,
          action.repeatMs,
          action.cues.map((cue) => [cue.delayMs, cue.preset]),
        ],
  );
}

export function normalizeDexConfig(config: IRiveConfig | undefined, owner: string | null) {
  if (!config || config.nativeSound !== undefined || owner !== "dex-tour-loader") return config;
  const source = DEX_RIVE_CONFIG;
  const completion = config.completion;
  if (
    config.artboard !== source.artboard ||
    config.viewModel !== source.viewModel ||
    !config.haptics ||
    Object.keys(config.haptics).length !== 4 ||
    !Object.entries(source.haptics).every(
      ([name, action]) => actionKey(config.haptics?.[name]) === actionKey(action),
    ) ||
    !completion ||
    !Object.entries(source.completion).every(([name, value]) =>
      Object.entries(completion).some(([key, current]) => key === name && current === value),
    )
  )
    return config;
  return { ...config, nativeSound: false };
}
