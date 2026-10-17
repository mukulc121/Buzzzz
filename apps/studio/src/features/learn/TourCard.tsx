import { LearnIcon } from "./LearnIcon";
import type { IWalkthrough } from "./model";

interface ITourCard {
  tour: IWalkthrough;
  done: boolean;
  onStart: () => void;
}
export function TourCard(props: ITourCard) {
  const { tour, done, onStart } = props;
  return (
    <button type="button" className={`learn-tour-card ${done ? "done" : ""}`} onClick={onStart}>
      <span className="learn-card-head">
        <span className={`learn-card-chip ${tour.tone}`}>
          <LearnIcon name={tour.tone} size={22} />
        </span>
        <span className="learn-card-title">{tour.title}</span>
      </span>
      <span className="learn-card-blurb">{tour.blurb}</span>
      <span className="learn-card-meta">
        {done ? (
          <>
            <LearnIcon name="check" size={14} />
            Done - replay
          </>
        ) : (
          <>
            <LearnIcon name="clock" size={14} />
            {tour.steps.length} steps
          </>
        )}
      </span>
    </button>
  );
}
