import { patternEnd } from "@buzzzz/core";
import { ToolIcon } from "../../components/ToolIcon";
import { LibraryThumbnail } from "./LibraryThumbnail";
import type { StudioPreset } from "./catalog";
import { writePresetDrag } from "./drag";

interface ILibraryRow {
  entry: StudioPreset;
  onInspect: (entry: StudioPreset) => void;
  onAppend: (entry: StudioPreset) => void;
  canEdit: boolean;
}

export function LibraryRow(props: ILibraryRow) {
  const { entry, onInspect, onAppend, canEdit } = props;
  const durationMs = patternEnd(entry.pattern);
  return (
    <li
      className="library-row"
      draggable={canEdit}
      onDragStart={(event) => writePresetDrag(event.dataTransfer, entry)}
      title={`${entry.name} - drag onto the chart, or use + to append`}
    >
      <LibraryThumbnail pattern={entry.pattern} />
      <span className="library-row-text">
        <span className="library-row-name">{entry.name}</span>
        <span className="library-row-meta">
          {durationMs === 0 ? "Instant" : `${durationMs} ms`}
        </span>
      </span>
      <span className="library-row-actions">
        <button
          className="icon"
          aria-label={`About ${entry.name}`}
          title={`About ${entry.name}`}
          onClick={() => onInspect(entry)}
        >
          <ToolIcon name="info" />
        </button>
        <button
          className="icon library-append"
          aria-label={`Append ${entry.name} to the pattern`}
          title={`Append ${entry.name} to the pattern`}
          disabled={!canEdit}
          onClick={() => onAppend(entry)}
        >
          <ToolIcon name="plus" />
        </button>
      </span>
    </li>
  );
}
