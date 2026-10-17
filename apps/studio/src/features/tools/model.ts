import type { Pattern } from "@buzzzz/core";
import type { useAudioTrack } from "../audio/useAudioTrack";
import type { TPhonePreset } from "../connection/phoneLibrary";
import type { useSnippetCapture } from "./useSnippetCapture";

export type ToolId =
  | "pulsar-library"
  | "snippets"
  | "tap-rhythm"
  | "voice-sketch"
  | "time-warp"
  | "audio-trim"
  | "signal-analyzer"
  | "compatibility-linter";

export interface IToolSession {
  pattern: Pattern;
  durationMs: number;
  audio: ReturnType<typeof useAudioTrack>;
  canEdit: boolean;
  onApply: (pattern: Pattern) => void;
  onAppend: (pattern: Pattern, timeMs?: number) => void;
  onAdd: (pattern?: Pattern, name?: string) => void;
  onError: (message: string) => void;
  onPreview: (pattern: Pattern, preset?: TPhonePreset) => void;
  onStopPreview: () => void;
  previewing: boolean;
  snippets?: ReturnType<typeof useSnippetCapture>;
}
