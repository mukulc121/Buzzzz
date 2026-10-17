import { useEffect, useRef, useState } from "react";
import "driver.js/dist/driver.css";
import "../../styles/learn.css";
import type { Studio } from "../../app/useStudio";
import { LearnDialog } from "./LearnDialog";
import { LearnCompletion } from "./LearnCompletion";
import { LearnHint } from "./LearnHint";
import { completedWalkthroughs, saveWalkthroughs, saveWelcomeSeen, welcomeSeen } from "./storage";
import { startWalkthrough } from "./startWalkthrough";
import type { IWalkthrough } from "./model";

interface ILearning {
  studio: Studio;
  open: boolean;
  onClose: () => void;
}
export function Learning(props: ILearning) {
  const { studio, open, onClose } = props;
  const [firstRun, setFirstRun] = useState(() => !welcomeSeen());
  const [completed, setCompleted] = useState(completedWalkthroughs);
  const [finished, setFinished] = useState<IWalkthrough | null>(null);
  const [hint, setHint] = useState(false);
  const stopTour = useRef<(() => void) | null>(null);
  useEffect(() => {
    if (open || firstRun) saveWelcomeSeen();
  }, [open, firstRun]);
  useEffect(() => () => stopTour.current?.(), []);
  useEffect(() => {
    if (open) stopTour.current?.();
  }, [open]);
  const dismiss = () => {
    setHint(firstRun);
    setFinished(null);
    setFirstRun(false);
    onClose();
  };
  const start = (tour: IWalkthrough) => {
    const wasFirstRun = firstRun;
    stopTour.current?.();
    setFirstRun(false);
    setHint(false);
    setFinished(null);
    onClose();
    stopTour.current = startWalkthrough({
      tour,
      studio,
      onComplete: () => {
        setCompleted((current) => {
          const next = current.includes(tour.id) ? current : [...current, tour.id];
          saveWalkthroughs(next);
          return next;
        });
        setFinished(tour);
      },
      onClose: (done) => {
        if (!done && wasFirstRun) setHint(true);
      },
    });
  };
  return (
    <>
      {(open || firstRun) && (
        <LearnDialog completed={completed} onClose={dismiss} onStart={start} />
      )}
      {hint && !open && <LearnHint onClose={() => setHint(false)} />}
      {finished && !open && (
        <LearnCompletion
          tour={finished}
          completed={completed}
          onClose={() => setFinished(null)}
          onStart={start}
        />
      )}
    </>
  );
}
