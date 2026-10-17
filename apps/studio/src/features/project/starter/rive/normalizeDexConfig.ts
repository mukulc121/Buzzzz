import { isRecord, type IRiveConfig } from "@buzzzz/core";
import { DEX_RIVE_CONFIG } from "./dex-rive-config";
import { DEX_RIVE_CONFIG_1063 } from "./dex-rive-config-1063";

function sameConfigValue(actual: unknown, expected: unknown): boolean {
  if (actual === expected) return true;
  if (Array.isArray(actual) && Array.isArray(expected))
    return (
      actual.length === expected.length &&
      actual.every((value, i) => sameConfigValue(value, expected[i]))
    );
  if (!isRecord(actual) || !isRecord(expected)) return false;
  return (
    Object.keys(actual).length === Object.keys(expected).length &&
    Object.entries(actual).every(
      ([key, value]) => Object.hasOwn(expected, key) && sameConfigValue(value, expected[key]),
    )
  );
}

/** Upgrades an unedited copy of the Dex 1063 starter script to the Dex 1069 profile; edited configs pass through. */
export function normalizeDexConfig(config: IRiveConfig | undefined, owner: string | null) {
  if (
    !config ||
    config.nativeSound === true ||
    (config.nativeSound === undefined && owner !== "dex-tour-loader")
  )
    return config;
  const candidate = config.nativeSound === undefined ? { ...config, nativeSound: false } : config;
  if (sameConfigValue(candidate, DEX_RIVE_CONFIG)) return candidate;
  const legacy = {
    ...candidate,
    completion: { ...candidate.completion, clock: candidate.completion?.clock ?? "mount" },
  };
  return sameConfigValue(legacy, DEX_RIVE_CONFIG_1063) ? structuredClone(DEX_RIVE_CONFIG) : config;
}
