import type { IRiveConfig } from "../rive/config";

// Dex PR 1069 (ed09e5dc) useDexTourLoaderHaptics: the play clock owns the phases; VM haptic triggers are breadcrumbs.
export const DEX_RIVE_CONFIG = {
  artboard: "artboard",
  viewModel: "ViewModel1",
  nativeSound: false,
  completion: {
    clock: "play",
    startTrigger: "hapticEntry",
    readyTrigger: "isLoaded",
    readyAfterMs: 2500,
    entryMs: 2200,
    loopPeriodMs: 1600,
    exitMs: 560,
    marginMs: 80,
    phases: {
      entry: "hapticEntry",
      loop: "hapticLoop",
      exit: "hapticExit",
      exitLeadMs: 60,
      markers: ["hapticLoopStop"],
    },
  },
  haptics: {
    hapticEntry: { kind: "sequence", cues: [{ delayMs: 400, pulsar: "EngineRev" }] },
    hapticLoop: {
      kind: "sequence",
      cues: [
        {
          delayMs: 0,
          pulsar: "Drone",
          tuning: { timeScale: 0.89, gain: 2.5, sharpnessBoost: 0.15 },
        },
      ],
      repeatMs: 1600,
    },
    hapticExit: { kind: "sequence", cues: [{ delayMs: 200, pulsar: "Lock" }] },
  },
} satisfies IRiveConfig;
