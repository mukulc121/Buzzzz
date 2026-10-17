import { useState, type ReactNode } from "react";
import type { Pattern } from "@buzzzz/core";
import type { IAnimationCandidate } from "./model";
import { SoundDialog } from "../audio/SoundDialog";
import { AnimationApproach } from "./AnimationApproach";
import { AnimationInspectorIcon } from "./AnimationInspectorIcon";
import type { useAnimationTrack } from "./useAnimationTrack";

interface IAnimationGenerationCandidates {
  candidates: readonly IAnimationCandidate[];
  currentPattern: Pattern;
  selection: ReturnType<typeof useAnimationTrack>["selection"];
  presetName: string;
  onApply: (pattern: Pattern, label: string) => void;
  onRestore: () => void;
  onPreserve: (pattern: Pattern, label: string) => string | null;
  renderControls: (candidate: IAnimationCandidate) => ReactNode;
}
export function AnimationGenerationCandidates(props: IAnimationGenerationCandidates) {
  const {
    candidates,
    currentPattern,
    presetName,
    onApply,
    onRestore,
    onPreserve,
    renderControls,
    selection,
  } = props;
  const [pending, setPending] = useState<{ id: IAnimationCandidate["id"] | null } | null>(null);
  const { selectedId, edited } = selection;
  const selectedName = candidates.find((candidate) => candidate.id === selectedId)?.label;
  const pendingName = candidates.find((candidate) => candidate.id === pending?.id)?.label;
  const select = (id: IAnimationCandidate["id"] | null) => {
    if (id === null) {
      onRestore();
      selection.select(null);
    } else {
      const candidate = candidates.find((item) => item.id === id);
      if (!candidate) return;
      onApply(candidate.pattern, candidate.label);
      selection.select({ id, pattern: candidate.pattern });
    }
    setPending(null);
  };
  const choose = (id: IAnimationCandidate["id"] | null) =>
    edited ? setPending({ id }) : select(id);
  return (
    <section
      className="animation-generation pulsar-generation"
      aria-label="Animation generation candidates"
    >
      <h3>Approaches</h3>
      <div className="animation-candidates">
        {candidates.map((candidate) => (
          <AnimationApproach
            key={candidate.id}
            candidate={candidate}
            active={selectedId === candidate.id}
            onChoose={() => choose(candidate.id)}
          >
            {selectedId === candidate.id ? renderControls(candidate) : null}
          </AnimationApproach>
        ))}
      </div>
      {edited && selectedId && (
        <p className="animation-metric-hint">
          You have edited <strong>{selectedName}</strong>. Switching approach will ask what to do
          with those changes.
        </p>
      )}
      <button
        type="button"
        className="inspector-text-action"
        disabled={selectedId === null}
        onClick={() => choose(null)}
      >
        <AnimationInspectorIcon name="reset" />
        Restore my pattern
      </button>
      {pending && (
        <SoundDialog title="You have unsaved changes" onClose={() => setPending(null)}>
          <p>
            You have edited <strong>{selectedName ?? "this approach"}</strong>.{" "}
            {pendingName ? (
              <>
                Switching to <strong>{pendingName}</strong> replaces the whole pattern.
              </>
            ) : (
              "Restoring your own pattern replaces the whole pattern."
            )}
          </p>
          <p>Keep the edits in a copy of this pattern, or discard them?</p>
          <div className="sound-confirm-actions">
            <button type="button" onClick={() => setPending(null)}>
              Cancel
            </button>
            <button type="button" onClick={() => select(pending.id)}>
              Discard
            </button>
            <button
              type="button"
              className="primary"
              onClick={() => {
                if (onPreserve(currentPattern, `${presetName} copy`)) select(pending.id);
              }}
            >
              Keep a copy
            </button>
          </div>
        </SoundDialog>
      )}
    </section>
  );
}
