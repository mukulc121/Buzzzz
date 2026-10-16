import { ToolIcon } from "../../components/ToolIcon";
import { LearnIcon } from "./LearnIcon";
import { WALKTHROUGHS } from "./tours";
import type { IWalkthrough } from "./model";
import { useEffect } from "react";
import { celebrateWalkthroughs } from "./celebrate";

interface ILearnCompletion {
  tour: IWalkthrough;
  completed: readonly string[];
  onClose: () => void;
  onStart: (tour: IWalkthrough) => void;
}
export function LearnCompletion(props: ILearnCompletion) {
  const { tour, completed, onClose, onStart } = props;
  const next = WALKTHROUGHS.find((item) => !completed.includes(item.id));
  useEffect(() => {
    if (!next) void celebrateWalkthroughs();
  }, [next]);
  return (
    <aside className="learn-completion" role="status" aria-live="polite">
      <header>
        <span className="learn-completion-badge">
          <LearnIcon name="check" size={16} />
        </span>
        <div>
          <p>{tour.title}</p>
          <small>
            {completed.length} of {WALKTHROUGHS.length} walkthroughs done
          </small>
        </div>
        <button type="button" className="icon" aria-label="Dismiss" onClick={onClose}>
          <ToolIcon name="close" size={16} />
        </button>
      </header>
      {next ? (
        <>
          <p>
            Next up: <strong>{next.title}</strong> -{" "}
            {next.blurb.charAt(0).toLowerCase() + next.blurb.slice(1)}
          </p>
          <footer>
            <button type="button" onClick={onClose}>
              Later
            </button>
            <button type="button" className="primary" onClick={() => onStart(next)}>
              <LearnIcon name="next" size={16} />
              Start · {next.steps.length} steps
            </button>
          </footer>
        </>
      ) : (
        <>
          <p>
            That is all of them. Everything else - the tools, snippets, sharing and export - is
            written up in the documentation.
          </p>
          <footer>
            <button type="button" onClick={onClose}>
              Back to work
            </button>
            <a href="https://docs.swmansion.com/pulsar/" target="_blank" rel="noreferrer">
              <LearnIcon name="book" size={16} />
              Documentation
            </a>
          </footer>
        </>
      )}
    </aside>
  );
}
