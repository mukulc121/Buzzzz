import type { IRiveConfig } from "@buzzzz/core";

// Dex PR 1063 (04153623) trigger-driven UIKit script; kept to recognise and upgrade saved copies.
export const DEX_RIVE_CONFIG_1063 = {
  artboard: "artboard",
  viewModel: "ViewModel1",
  nativeSound: false,
  completion: {
    clock: "mount",
    startTrigger: "hapticEntry",
    readyTrigger: "isLoaded",
    readyAfterMs: 2500,
    entryMs: 2200,
    loopPeriodMs: 1600,
    exitMs: 560,
    marginMs: 80,
  },
  haptics: {
    hapticEntry: {
      kind: "sequence",
      cues: [
        { delayMs: 600, preset: "impactSoft" },
        { delayMs: 1800, preset: "impactLight" },
      ],
    },
    hapticLoop: {
      kind: "sequence",
      cues: [
        { delayMs: 0, preset: "impactSoft" },
        { delayMs: 160, preset: "impactSoft" },
        { delayMs: 360, preset: "impactSoft" },
      ],
      repeatMs: 1600,
    },
    hapticLoopStop: { kind: "stop", trigger: "hapticLoop" },
    hapticExit: {
      kind: "sequence",
      immediate: "impactSoft",
      cues: [
        { delayMs: 290, preset: "impactMedium" },
        { delayMs: 430, preset: "impactLight" },
      ],
    },
  },
} satisfies IRiveConfig;
