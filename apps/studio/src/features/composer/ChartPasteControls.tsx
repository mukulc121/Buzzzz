import { ContextMenuIcon } from "../../components/ContextMenuIcon";
import type { IChartGeometry } from "./geometry";
import type { IChartClipboard, TPasteMode } from "./pasteModel";

interface IChartPasteControls {
  geometry: IChartGeometry;
  clipboard: IChartClipboard;
  start: number;
  mode: TPasteMode;
  onModeChange: (mode: TPasteMode) => void;
  onApply: () => void;
  onCancel: () => void;
}

const MODES: readonly { mode: TPasteMode; label: string }[] = [
  { mode: "both", label: "Both" },
  { mode: "amplitude", label: "Amplitude" },
  { mode: "frequency", label: "Frequency" },
];

export function ChartPasteControls(props: IChartPasteControls) {
  const { geometry, clipboard, start, mode } = props;
  const center = (geometry.x(start) + geometry.x(start + clipboard.width)) / 2;
  const left = Math.min(Math.max(center, geometry.left + 130), geometry.right - 130);
  return (
    <div className="chart-paste-actions" style={{ left, top: geometry.top + 8 }}>
      <div className="chart-paste-buttons">
        <button
          type="button"
          className="chart-paste-apply"
          title="Apply paste"
          onClick={props.onApply}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </button>
        <button
          type="button"
          className="chart-paste-cancel"
          title="Cancel paste"
          onClick={props.onCancel}
        >
          <ContextMenuIcon name="trash" />
        </button>
      </div>
      <div className="chart-paste-modes" role="group" aria-label="Paste layers">
        {MODES.map((item) => (
          <button
            key={item.mode}
            type="button"
            aria-pressed={mode === item.mode}
            disabled={
              item.mode !== "both" && clipboard.pattern.continuousPattern[item.mode].length === 0
            }
            onClick={() => props.onModeChange(item.mode)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
