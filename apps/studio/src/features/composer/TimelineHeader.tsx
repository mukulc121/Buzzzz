import type { TimelineLaneId } from "./TimelineLanes";

interface ITimelineHeader {
  collapsed: boolean;
  onCollapsedChange: (value: boolean) => void;
  available: readonly { id: TimelineLaneId; label: string }[];
  lanes: readonly TimelineLaneId[];
  onToggleLane: (id: TimelineLaneId) => void;
  rangeEnabled: boolean;
  onRangeEnabledChange: (value: boolean) => void;
  onZoom: (factor: number) => void;
  onFit: () => void;
  end: number;
}

export function TimelineHeader(props: ITimelineHeader) {
  const { collapsed, onCollapsedChange, available, lanes, onToggleLane } = props;
  const { rangeEnabled, onRangeEnabledChange, onZoom, onFit, end } = props;
  return (
    <header>
      <button
        className="link"
        aria-expanded={!collapsed}
        onClick={() => onCollapsedChange(!collapsed)}
      >
        Timeline {collapsed ? "▸" : "▾"}
      </button>
      {available.length > 1 &&
        available.map(({ id, label }) => (
          <button
            key={id}
            className="timeline-lane-toggle"
            aria-pressed={lanes.includes(id)}
            onClick={() => onToggleLane(id)}
          >
            {label}
          </button>
        ))}
      <span className="spacer" />
      <label className="timeline-range-toggle">
        <input
          type="checkbox"
          checked={rangeEnabled}
          onChange={(event) => onRangeEnabledChange(event.target.checked)}
        />
        Playback range
      </label>
      <button aria-label="Zoom out" onClick={() => onZoom(1.5)}>
        −
      </button>
      <button aria-label="Zoom in" onClick={() => onZoom(1 / 1.5)}>
        +
      </button>
      <button onClick={onFit}>Fit</button>
      <output className="timeline-readout">{Math.round(end)} ms</output>
    </header>
  );
}
