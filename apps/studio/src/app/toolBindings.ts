import { patternEnd } from "@buzzzz/core";
import type { Studio } from "./useStudio";
import type { IToolSession } from "../features/tools/model";
import { insertLibraryPattern } from "../features/presets/insertPattern";

export function toolBindings(studio: Studio): IToolSession {
  const durationMs = Math.max(
    patternEnd(studio.document.pattern),
    studio.document.preset.editor?.durationMs ?? 0,
    studio.audio.source ? studio.audio.trim.endMs - studio.audio.trim.startMs : 0,
    studio.animation.source?.durationMs ?? 0,
  );
  return {
    pattern: studio.document.pattern,
    durationMs,
    audio: studio.audio,
    canEdit: studio.document.isWriter,
    onApply: studio.applyPattern,
    onAppend: (pattern, timeMs = durationMs) => {
      if (!studio.document.isWriter) return;
      try {
        const next = insertLibraryPattern(studio.document.pattern, pattern, timeMs);
        studio.applyPattern(next);
        studio.composer.fit(Math.max(durationMs, patternEnd(next)));
      } catch (error) {
        studio.setError(error instanceof Error ? error.message : "Could not insert this pattern");
      }
    },
    onAdd: studio.addPreset,
    onError: studio.setError,
    onPreview: studio.audition,
    onStopPreview: studio.previewPlayback.stop,
    previewing: studio.previewPlayback.playing,
  };
}
