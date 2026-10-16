interface ITimelineHeader {
  collapsed: boolean;
  onCollapsedChange: (value: boolean) => void;
  onZoom: (factor: number) => void;
}

function ZoomIcon(props: { inside: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden
    >
      <circle cx="6.5" cy="6.5" r="4.5" />
      <path d="m10 10 4 4M4 6.5h5" />
      {props.inside && <path d="M6.5 4v5" />}
    </svg>
  );
}

export function TimelineHeader(props: ITimelineHeader) {
  const { collapsed, onCollapsedChange, onZoom } = props;
  return (
    <header className="timeline-header">
      <span>Timeline</span>
      <div className="timeline-actions">
        {!collapsed && (
          <>
            <button
              className="icon"
              aria-label="Zoom timeline out"
              title="Zoom timeline out"
              onClick={() => onZoom(1.15)}
            >
              <ZoomIcon inside={false} />
            </button>
            <button
              className="icon"
              aria-label="Zoom timeline in"
              title="Zoom timeline in"
              onClick={() => onZoom(1 / 1.15)}
            >
              <ZoomIcon inside />
            </button>
          </>
        )}
        <button
          className="icon"
          aria-label={collapsed ? "Show timeline" : "Hide timeline"}
          title={collapsed ? "Show timeline" : "Hide timeline"}
          aria-expanded={!collapsed}
          onClick={() => onCollapsedChange(!collapsed)}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden
          >
            <rect x="2" y="2" width="12" height="12" rx="1" />
            <path d={collapsed ? "m5 9 3-3 3 3" : "m5 6 3 3 3-3"} />
          </svg>
        </button>
      </div>
    </header>
  );
}
