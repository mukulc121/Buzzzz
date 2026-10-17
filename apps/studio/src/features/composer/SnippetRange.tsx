import { useRef, type PointerEvent } from "react";
import { ToolIcon } from "../../components/ToolIcon";
import type { IChartGeometry } from "./geometry";
import type { IPlaybackRange } from "./model";

interface ISnippetRange {
  geometry: IChartGeometry;
  range: IPlaybackRange;
  durationMs: number;
  onChange: (range: IPlaybackRange) => void;
  onSave: () => void;
  onCancel: () => void;
}

function SnippetRail(props: ISnippetRange & { edge: "start" | "end" }) {
  const { geometry, range, edge, durationMs, onChange } = props;
  const dragging = useRef<number | null>(null);
  const minimum = edge === "start" ? 0 : Math.min(durationMs, range.start + 10);
  const maximum = edge === "start" ? Math.max(0, range.end - 10) : durationMs;
  const update = (time: number) =>
    onChange({ ...range, [edge]: Math.min(maximum, Math.max(minimum, Math.round(time))) });
  const move = (event: PointerEvent<SVGGElement>) => {
    if (dragging.current === null) return;
    event.stopPropagation();
    const bounds = event.currentTarget.ownerSVGElement?.getBoundingClientRect();
    if (bounds) update(geometry.timeAtX(event.clientX - bounds.left - dragging.current));
  };
  const x = geometry.x(range[edge]);
  if (x < geometry.left || x > geometry.right) return null;
  const labelX = edge === "start" ? -56 : 2;
  return (
    <g
      transform={`translate(${x} 0)`}
      className="snippet-range-rail"
      role="slider"
      aria-label={`Snippet ${edge}`}
      aria-valuemin={minimum}
      aria-valuemax={maximum}
      aria-valuenow={range[edge]}
      tabIndex={0}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        const bounds = event.currentTarget.ownerSVGElement?.getBoundingClientRect();
        if (!bounds) return;
        dragging.current = event.clientX - bounds.left - x;
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={move}
      onPointerUp={() => {
        dragging.current = null;
      }}
      onPointerCancel={() => {
        dragging.current = null;
      }}
      onLostPointerCapture={() => {
        dragging.current = null;
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          event.stopPropagation();
          update(range[edge] + (event.key === "ArrowRight" ? 1 : -1) * (event.shiftKey ? 10 : 1));
        }
      }}
    >
      <rect x={-7} y={geometry.top} width={14} height={geometry.plotHeight} fill="transparent" />
      <line
        x1={0}
        x2={0}
        y1={geometry.top}
        y2={geometry.bottom}
        stroke="var(--fg)"
        strokeWidth={2}
        pointerEvents="none"
      />
      <rect
        x={labelX}
        y={geometry.top}
        width={54}
        height={16}
        rx={3}
        fill="var(--fg)"
        pointerEvents="none"
      />
      <text
        x={labelX + 27}
        y={geometry.top + 12}
        textAnchor="middle"
        fill="var(--panel)"
        fontSize={10}
        pointerEvents="none"
      >
        {range[edge]} ms
      </text>
    </g>
  );
}

export function SnippetRange(props: ISnippetRange) {
  const { geometry, range, onSave, onCancel } = props;
  const left = Math.min(geometry.right, Math.max(geometry.left, geometry.x(range.start)));
  const right = Math.min(geometry.right, Math.max(geometry.left, geometry.x(range.end)));
  return (
    <>
      <svg
        className="snippet-range-overlay"
        viewBox={`0 0 ${geometry.width} ${geometry.height}`}
        aria-label="Snippet range"
      >
        <g fill="var(--out-of-range)" opacity={0.65} pointerEvents="none">
          <rect
            x={geometry.left}
            y={geometry.top}
            width={Math.max(0, left - geometry.left)}
            height={geometry.plotHeight}
          />
          <rect
            x={right}
            y={geometry.top}
            width={Math.max(0, geometry.right - right)}
            height={geometry.plotHeight}
          />
        </g>
        <SnippetRail {...props} edge="start" />
        <SnippetRail {...props} edge="end" />
      </svg>
      <div
        className="snippet-range-actions"
        style={{
          left: Math.min(Math.max((left + right) / 2, geometry.left + 110), geometry.right - 110),
          top: geometry.top + 8,
        }}
      >
        <div className="snippet-range-bar">
          <span className="snippet-range-readout">{range.end - range.start} ms</span>
          <button
            type="button"
            className="snippet-range-save"
            title="Save the framed range as a snippet"
            onClick={onSave}
          >
            <ToolIcon name="bookmark" size={14} />
            Save snippet
          </button>
          <button
            type="button"
            className="snippet-range-cancel"
            title="Cancel (Esc)"
            aria-label="Cancel snippet range"
            onClick={onCancel}
          >
            <ToolIcon name="close" size={14} />
          </button>
        </div>
      </div>
    </>
  );
}
