import type { ReactNode } from "react";
import type { IAnimationCandidate } from "./model";
import { InspectorIcon } from "../../components/InspectorIcon";

interface IAnimationApproach {
  candidate: IAnimationCandidate;
  active: boolean;
  onChoose: () => void;
  children?: ReactNode;
  disabled: boolean;
}
export function AnimationApproach(props: IAnimationApproach) {
  const { candidate, active, onChoose, children, disabled } = props;
  return (
    <article className="audio-candidate generation-approach-container">
      <button
        type="button"
        className="generation-approach"
        aria-label={`Apply ${candidate.label}`}
        aria-pressed={active}
        disabled={disabled || (!candidate.eventCount && !candidate.pointCount)}
        onClick={onChoose}
      >
        <strong>{candidate.label}</strong>
        <span className="generation-approach-description">{candidate.description}</span>
        <span className="generation-approach-meta">
          {candidate.pointCount} points · {candidate.eventCount} events
        </span>
        <span
          className="generation-approach-info"
          title={candidate.approximate ? "Estimated from the media signal." : candidate.description}
        >
          <InspectorIcon name="info" />
        </span>
      </button>
      {children}
    </article>
  );
}
