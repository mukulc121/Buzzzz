import type { Preset } from "@buzzzz/core";
import type { MediaKind } from "../../../features/media/model";
import type { IExportFiles } from "../../../features/export/model";

interface IExportPresetRow {
  preset: Preset;
  open: boolean;
  checked: boolean;
  kinds: readonly MediaKind[];
  files: IExportFiles;
  onToggle: () => void;
}

export function ExportPresetRow(props: IExportPresetRow) {
  const { preset, open, checked, kinds, files, onToggle } = props;
  const included = [
    files.includeAudio && kinds.includes("audio") && "audio",
    files.includeAnimation && kinds.includes("animation") && "animation",
  ].filter(Boolean);
  return (
    <li>
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        aria-label={preset.name}
        className="export-preset"
        onClick={onToggle}
      >
        <span className="export-check" aria-hidden="true">
          {checked && (
            <svg
              width="12"
              height="12"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
            >
              <path d="m3 8 3 3 7-7" />
            </svg>
          )}
        </span>
        <span className="export-preset-name">
          <span>{preset.name}</span>
          {open && <span className="export-preset-tag">open</span>}
        </span>
        <span className="export-preset-meta">
          {included.length ? `+ ${included.join(", ")}` : ""}
        </span>
      </button>
    </li>
  );
}
