import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Pattern } from "@buzzzz/core";
import type { IAnimationCandidate } from "./model";
import { deriveAudioReplacement } from "../audio/selection";
import { SoundDialog } from "../audio/SoundDialog";
import { AnimationApproach } from "./AnimationApproach";

interface IAnimationGenerationCandidates {
  candidates: readonly IAnimationCandidate[];
  currentPattern: Pattern;
  onApply: (pattern: Pattern, label: string) => void;
  onRestore: () => void;
  onPreserve?: (pattern: Pattern, label: string) => void;
  renderControls: (candidate: IAnimationCandidate) => ReactNode;
  working: boolean;
}
export function AnimationGenerationCandidates(props: IAnimationGenerationCandidates) {
  const { candidates, currentPattern, onApply, onRestore, onPreserve, renderControls, working } =
    props;
  const [appliedId, setAppliedId] = useState<IAnimationCandidate["id"] | null>(null);
  const lastAppliedPattern = useRef<Pattern | null>(null);
  const [pending, setPending] = useState<IAnimationCandidate | null>(null);
  useEffect(() => {
    if (!appliedId || !lastAppliedPattern.current) return;
    const candidate = candidates.find((item) => item.id === appliedId);
    if (
      !candidate ||
      deriveAudioReplacement(currentPattern, lastAppliedPattern.current, null) !== "unchanged" ||
      deriveAudioReplacement(lastAppliedPattern.current, candidate.pattern, null) === "unchanged"
    )
      return;
    lastAppliedPattern.current = candidate.pattern;
    onApply(candidate.pattern, candidate.label);
  }, [appliedId, candidates, currentPattern, onApply]);
  const apply = (candidate: IAnimationCandidate) => {
    onApply(candidate.pattern, candidate.label);
    lastAppliedPattern.current = candidate.pattern;
    setAppliedId(candidate.id);
    setPending(null);
  };
  const choose = (candidate: IAnimationCandidate) => {
    const action = deriveAudioReplacement(
      currentPattern,
      candidate.pattern,
      lastAppliedPattern.current,
    );
    if (action === "confirm") setPending(candidate);
    if (action === "replace") apply(candidate);
    if (action === "unchanged") {
      lastAppliedPattern.current = candidate.pattern;
      setAppliedId(candidate.id);
    }
  };
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
            disabled={working}
            active={
              appliedId === candidate.id &&
              deriveAudioReplacement(currentPattern, candidate.pattern, null) === "unchanged"
            }
            onChoose={() => choose(candidate)}
          >
            {appliedId === candidate.id ? renderControls(candidate) : null}
          </AnimationApproach>
        ))}
      </div>
      <button
        type="button"
        className="inspector-text-action"
        onClick={() => {
          onRestore();
          setAppliedId(null);
          lastAppliedPattern.current = null;
          setPending(null);
        }}
      >
        Restore original
      </button>
      {pending && (
        <SoundDialog title="Replace current pattern?" onClose={() => setPending(null)}>
          <p>Apply {pending.label}? This replaces the current pattern, including your edits.</p>
          <div className="sound-confirm-actions">
            {onPreserve && (
              <button
                type="button"
                className="primary"
                onClick={() => {
                  onPreserve(currentPattern, "Edited animation pattern");
                  apply(pending);
                }}
              >
                Keep a copy and apply
              </button>
            )}
            <button type="button" onClick={() => apply(pending)}>
              Replace pattern
            </button>
            <button type="button" onClick={() => setPending(null)}>
              Cancel
            </button>
          </div>
        </SoundDialog>
      )}
    </section>
  );
}
