import { useState } from "react";
import type { Pattern } from "@buzzzz/core";
import type { IAnimationCandidate } from "../animation/model";
import type { IAudioCandidate } from "../audio/model";
import { deriveAudioReplacement } from "../audio/selection";

type Candidate = IAudioCandidate | IAnimationCandidate;
interface IGenerationCandidates {
  kind: "audio" | "animation";
  candidates: readonly Candidate[];
  currentPattern: Pattern;
  onApply: (pattern: Pattern, label: string) => void;
  onRestore: () => void;
  onPreserve?: (pattern: Pattern, label: string) => void;
}

export function GenerationCandidates(props: IGenerationCandidates) {
  const { kind, candidates, currentPattern, onApply, onRestore, onPreserve } = props;
  const [applied, setApplied] = useState<Candidate | null>(null);
  const [pending, setPending] = useState<Candidate | null>(null);
  const apply = (candidate: Candidate) => {
    onApply(candidate.pattern, candidate.label);
    setApplied(candidate);
    setPending(null);
  };
  const choose = (candidate: Candidate) => {
    const action = deriveAudioReplacement(
      currentPattern,
      candidate.pattern,
      applied?.pattern ?? null,
    );
    if (action === "confirm") setPending(candidate);
    if (action === "replace") apply(candidate);
    if (action === "unchanged") setApplied(candidate);
  };
  return (
    <section
      className={`${kind}-generation`}
      aria-label={
        kind === "audio" ? "Audio generation candidates" : "Animation generation candidates"
      }
    >
      <div className="row">
        <h3 className="grow">Generation approaches</h3>
        <button
          type="button"
          onClick={() => {
            onRestore();
            setApplied(null);
            setPending(null);
          }}
        >
          Restore original
        </button>
      </div>
      {pending && (
        <div className="audio-confirm" role="alert">
          <p>Apply {pending.label}? This replaces the current pattern, including your edits.</p>
          <div className="row">
            {onPreserve && (
              <button
                type="button"
                className="primary"
                onClick={() => {
                  onPreserve(currentPattern, `Edited ${kind} pattern`);
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
        </div>
      )}
      <div
        className={kind === "audio" ? "audio-candidates" : "audio-candidates animation-candidates"}
      >
        {candidates.map((candidate) => (
          <article className="audio-candidate" key={candidate.id}>
            <h4>
              {candidate.label}
              {candidate.approximate && <span className="badge">Estimate</span>}
            </h4>
            <p className="hint">{candidate.description}</p>
            <p className="hint">
              {candidate.eventCount} taps · {candidate.pointCount} curve points
            </p>
            <button
              type="button"
              disabled={!candidate.eventCount && !candidate.pointCount}
              aria-pressed={
                applied?.id === candidate.id &&
                deriveAudioReplacement(currentPattern, candidate.pattern, null) === "unchanged"
              }
              onClick={() => choose(candidate)}
            >
              Apply {candidate.label}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
