import { useEffect, useId, useRef } from "react";
import { ToolIcon } from "../../components/ToolIcon";
import { LearnIcon } from "./LearnIcon";
import { TourCard } from "./TourCard";
import { WALKTHROUGHS } from "./tours";
import type { IWalkthrough } from "./model";

interface ILearnDialog {
  completed: readonly string[];
  onClose: () => void;
  onStart: (tour: IWalkthrough) => void;
}
export function LearnDialog(props: ILearnDialog) {
  const { completed, onClose, onStart } = props;
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const fresh = completed.length === 0;
  const next = WALKTHROUGHS.find((tour) => !completed.includes(tour.id)) ?? WALKTHROUGHS[0];
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="learn-dialog"
      aria-labelledby={titleId}
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <header>
        <h2 id={titleId}>{fresh ? "Welcome to Buzzzz Studio" : "Getting started"}</h2>
        <button type="button" className="library-dialog-close" aria-label="Close" onClick={onClose}>
          <ToolIcon name="close" size={20} />
        </button>
      </header>
      {fresh ? (
        <p className="learn-intro">
          Four walkthroughs, each a handful of steps. They run right here in the editor, on the
          pattern you have open - and change nothing in it.
        </p>
      ) : (
        <div className="learn-progress">
          <div className="learn-progress-track">
            <div
              style={{ width: `${(completed.length / WALKTHROUGHS.length) * 100}%` }}
              role="progressbar"
              aria-valuenow={completed.length}
              aria-valuemin={0}
              aria-valuemax={WALKTHROUGHS.length}
              aria-label="Walkthroughs finished"
            />
          </div>
          <span>
            {completed.length} of {WALKTHROUGHS.length} done
          </span>
        </div>
      )}
      <div className="learn-grid">
        {WALKTHROUGHS.map((tour) => (
          <TourCard
            key={tour.id}
            tour={tour}
            done={completed.includes(tour.id)}
            onStart={() => onStart(tour)}
          />
        ))}
      </div>
      <footer>
        <a href="https://docs.swmansion.com/pulsar/" target="_blank" rel="noreferrer">
          <LearnIcon name="book" size={16} />
          Read the documentation <span aria-hidden="true">↗</span>
        </a>
        <div>
          <button type="button" onClick={onClose}>
            {fresh ? "I’ll explore on my own" : "Close"}
          </button>
          {next && (
            <button type="button" className="primary" onClick={() => onStart(next)}>
              <ToolIcon name="play" size={16} />
              {fresh ? "Start with the basics" : `Continue: ${next.title}`}
            </button>
          )}
        </div>
      </footer>
    </dialog>
  );
}
