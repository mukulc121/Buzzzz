import type { ITimelineMarker } from "./model";
import { fractionOf, timelineTicks } from "./timelineGeometry";
import type { TimelinePointerHandlers } from "./useTimelineDrag";

interface ITimelineRuler {
  end: number;
  markers: readonly ITimelineMarker[];
  onSeek: (time: number) => void;
  scrub: TimelinePointerHandlers;
}

export function TimelineRuler(props: ITimelineRuler) {
  const { end, markers, onSeek, scrub } = props;
  return (
    <div className="timeline-ruler" {...scrub}>
      {timelineTicks(end).map((tick) => (
        <span
          key={tick}
          className="timeline-tick"
          style={{ left: `${fractionOf(tick, end) * 100}%` }}
        >
          {tick >= 1000 ? `${tick / 1000}s` : tick}
        </span>
      ))}
      {markers.map((marker) => (
        <button
          key={marker.id}
          className="timeline-marker"
          style={{ left: `${fractionOf(marker.time, end) * 100}%` }}
          aria-label={`Seek to ${marker.label} at ${Math.round(marker.time)} milliseconds`}
          title={marker.label}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => onSeek(marker.time)}
        />
      ))}
    </div>
  );
}
