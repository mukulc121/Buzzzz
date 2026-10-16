import type { Pattern } from "@buzzzz/core";
import { toPattern } from "../audio/generation/pattern";
import type { IVoiceSignal } from "../audio/voice/analysis";
import { voiceToPulsar } from "../audio/voice/pattern";

export function voicePattern(signal: IVoiceSignal): Pattern {
  if (!signal.linearRms.some((value) => value > 0.0001))
    throw new Error("No voice detected. Check your microphone and record again.");
  return toPattern(voiceToPulsar(signal));
}
