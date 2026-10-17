import type { ReactNode } from "react";
import type { IAnimationCandidate } from "./model";
import { InspectorIcon } from "../../components/InspectorIcon";

interface IAnimationApproach {
  candidate: IAnimationCandidate;
  active: boolean;
  onChoose: () => void;
  children?: ReactNode;
}
export function AnimationApproach(props: IAnimationApproach) {
  const { candidate, active, onChoose, children } = props;
  const empty = !candidate.eventCount && !candidate.pattern.continuousPattern.amplitude.length;
  return (
    <article className="audio-candidate generation-approach-container">
      <button
        type="button"
        className="generation-approach"
        aria-label={`Apply ${candidate.label}`}
        aria-pressed={active}
        disabled={empty}
        onClick={onChoose}
      >
        <strong>{candidate.label}</strong>
        <span className="generation-approach-description">
          {empty ? "Found no motion to work with." : candidate.description}
        </span>
        {!empty && (
          <span className="generation-approach-meta">
            {candidate.pointCount} points
            {candidate.eventCount > 0 && ` · ${candidate.eventCount} events`}
          </span>
        )}
      </button>
      <span className="generation-approach-info" title={candidate.description}>
        <InspectorIcon name="info" />
      </span>
      {children}
    </article>
  );
}
