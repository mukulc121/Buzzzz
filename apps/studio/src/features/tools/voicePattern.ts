import type { Pattern } from "@buzzzz/core";
import { toPattern } from "../audio/generation/pattern";
import type { IVoiceSignal } from "../audio/voice/analysis";
import { voiceToPulsar, type IVoiceOptions } from "../audio/voice/pattern";

export function voicePattern(signal: IVoiceSignal, options?: IVoiceOptions): Pattern {
  return toPattern(voiceToPulsar(signal, options));
}
