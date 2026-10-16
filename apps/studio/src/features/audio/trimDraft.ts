interface ITrimDraft {
  startMs: number;
  endMs: number;
}

export function constrainTrimDraft(trim: ITrimDraft, durationMs: number): ITrimDraft {
  const startMs = Math.min(Math.max(0, durationMs - 1), Math.max(0, trim.startMs));
  return {
    startMs,
    endMs: Math.min(durationMs, startMs + 60000, Math.max(startMs + 1, trim.endMs)),
  };
}
