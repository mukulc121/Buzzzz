interface ITimelineRuler {
  start: number;
  end: number;
}

export function TimelineRuler(props: ITimelineRuler) {
  return (
    <div className="timeline-ruler" aria-hidden>
      <span>{Math.round(props.start)} ms</span>
      <span>{Math.round(props.end)} ms</span>
    </div>
  );
}
