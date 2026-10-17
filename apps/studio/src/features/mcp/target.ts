import type { Pattern } from "@buzzzz/core";
import type { useAudioTrack } from "../audio/useAudioTrack";
import type { useAnimationTrack } from "../animation/useAnimationTrack";
import type { useComposer } from "../composer/useComposer";
import type { usePlayback } from "../composer/usePlayback";
import type { AttachedTracks } from "../media/useAttachedTracks";
import type { useProject } from "../project/useProject";
import type { TMediaKind } from "./commands";

type TAudio = ReturnType<typeof useAudioTrack>;
type TAnimation = ReturnType<typeof useAnimationTrack>;

// The live editor slice MCP commands may read or drive, re-read after every await.
export interface IEditorTarget {
  document: Pick<
    ReturnType<typeof useProject>,
    "isWriter" | "pattern" | "canUndo" | "canRedo" | "undo" | "redo"
  >;
  composer: Pick<
    ReturnType<typeof useComposer>,
    "selection" | "setSelected" | "setSelection" | "range" | "setRange"
  >;
  playback: Pick<ReturnType<typeof usePlayback>, "playhead" | "setPlayhead" | "playing">;
  audio: Pick<TAudio, "source" | "decoding" | "trim" | "setTrim"> & {
    metrics: Pick<TAudio["metrics"], "frameMs" | "params">;
    generation: Pick<TAudio["generation"], "options" | "strategyParams">;
  };
  animation: Pick<
    TAnimation,
    | "source"
    | "loading"
    | "analysis"
    | "frameMs"
    | "generationOptions"
    | "hybrid"
    | "strategyParams"
    | "setSeekMs"
  >;
  media: Pick<AttachedTracks, "importFile" | "detach" | "pending" | "ready"> & {
    library: Pick<AttachedTracks["library"], "attachment">;
  };
  applyGenerated: (pattern: Pattern) => void;
  preserve: (pattern: Pattern, name: string) => void;
}

export interface ICommandContext {
  read: () => IEditorTarget;
  signal: AbortSignal;
  loadAsset: (input: { url: string; kind: TMediaKind; signal: AbortSignal }) => Promise<Blob>;
}
