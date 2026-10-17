export const BALLOON_RELEASE_MS = 180;
export const BALLOON_LONG_PRESS_MS = 140;
export const BALLOON_FADE_MS = 120;
export const BALLOON_RESET_MS = 1000;

export const BALLOON_PROFILES = [
  {
    chargeMs: 950,
    ampMin: 0.05,
    ampMid: 0.28,
    ampMax: 0.75,
    freqHigh: 0.75,
    freqLow: 0.22,
    shakeImpulseFreq: 0.5,
    shakeAmt: 5,
    shakeDur: 40,
    shakeThreshold: 0.75,
  },
  {
    chargeMs: 1100,
    ampMin: 0.07,
    ampMid: 0.35,
    ampMax: 0.85,
    freqHigh: 0.5,
    freqLow: 0.1,
    shakeImpulseFreq: 0.18,
    shakeAmt: 8,
    shakeDur: 58,
    shakeThreshold: 0.72,
  },
  {
    chargeMs: 780,
    ampMin: 0.03,
    ampMid: 0.18,
    ampMax: 0.5,
    freqHigh: 0.95,
    freqLow: 0.4,
    shakeImpulseFreq: 0.82,
    shakeAmt: 4,
    shakeDur: 26,
    shakeThreshold: 0.78,
  },
  {
    chargeMs: 870,
    ampMin: 0.06,
    ampMid: 0.25,
    ampMax: 0.75,
    freqHigh: 0.68,
    freqLow: 0.18,
    shakeImpulseFreq: 0.42,
    shakeAmt: 6,
    shakeDur: 32,
    shakeThreshold: 0.73,
  },
];

export type BalloonProfile = (typeof BALLOON_PROFILES)[number];

type BalloonCommand =
  | { kind: "stop" | "pop" | "shakeStart" | "shakeStop" }
  | { kind: "set" | "discrete"; amplitude: number; frequency: number };

export function balloonFeedback(
  current: number,
  previous: number,
  active: boolean,
  profile: BalloonProfile,
): BalloonCommand[] {
  "worklet";
  if (!active) return [{ kind: "stop" }];
  if (current >= 1 && previous < 1) {
    return [{ kind: "stop" }, { kind: "discrete", amplitude: 1, frequency: 1 }, { kind: "pop" }];
  }
  if (current <= 0 && previous > 0) {
    return [{ kind: "stop" }, { kind: "discrete", amplitude: 0.18, frequency: profile.freqLow }];
  }
  const commands: BalloonCommand[] = [];
  if (current > 0 && current < profile.shakeThreshold) {
    const ratio = Math.max(0, Math.min(1, current / profile.shakeThreshold));
    commands.push({
      kind: "set",
      amplitude: profile.ampMin + ratio * (profile.ampMid - profile.ampMin),
      frequency: profile.freqHigh + ratio * (profile.freqLow - profile.freqHigh),
    });
  }
  if (current >= profile.shakeThreshold && previous < profile.shakeThreshold)
    commands.push({ kind: "shakeStart" });
  else if (current < profile.shakeThreshold && previous >= profile.shakeThreshold)
    commands.push({ kind: "shakeStop" });
  return commands;
}

export function balloonImpulse(
  progress: number,
  previous: number,
  current: number,
  profile: BalloonProfile,
) {
  "worklet";
  if (progress < profile.shakeThreshold) return;
  if (!((previous > 0.5 && current < -0.5) || (previous < -0.5 && current > 0.5))) return;
  const ratio = Math.max(
    0,
    Math.min(1, (progress - profile.shakeThreshold) / (1 - profile.shakeThreshold)),
  );
  return {
    amplitude: profile.ampMid + ratio * (profile.ampMax - profile.ampMid),
    frequency: profile.shakeImpulseFreq,
  };
}
