import { useState } from "react";
import { filterStudioPresets, studioPresets, type StudioPreset } from "./catalog";
import { LibraryDetail } from "./LibraryDetail";
import { LibraryFilters } from "./LibraryFilters";
import { LibraryRow } from "./LibraryRow";
import type { Pattern } from "@buzzzz/core";
import type { TPhonePreset } from "../connection/phoneLibrary";

interface ILibrary {
  onPreview: (pattern: Pattern, preset?: TPhonePreset) => void;
  onStopPreview: () => void;
  onAppend: (pattern: Pattern, timeMs?: number) => void;
  previewing: boolean;
  durationMs: number;
  canEdit: boolean;
}

export function Library(props: ILibrary) {
  const { onPreview, onStopPreview, onAppend, previewing, durationMs, canEdit } = props;
  const [query, setQuery] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [detail, setDetail] = useState<StudioPreset | null>(null);
  const filtered = filterStudioPresets({ query, tags });
  const append = (entry: StudioPreset) => onAppend(entry.pattern);
  return (
    <div className="preset-library">
      <div className="library-search">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.34-4.34" />
        </svg>
        <input
          type="search"
          aria-label="Search Pulsar presets"
          placeholder={`Search ${studioPresets.length} patterns…`}
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
        />
        {query && (
          <button className="icon" aria-label="Clear search" onClick={() => setQuery("")}>
            ×
          </button>
        )}
      </div>
      <LibraryFilters
        active={tags}
        onToggle={(tag) =>
          setTags((current) =>
            current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag],
          )
        }
        onClear={() => setTags([])}
      />
      <p className="library-count">
        {filtered.length} of {studioPresets.length} presets
      </p>
      {filtered.length === 0 ? (
        <p className="library-empty">
          Nothing matches those filters. Clear a tag or change the search.
        </p>
      ) : (
        <ul className="library-list">
          {filtered.map((entry) => (
            <LibraryRow
              key={entry.id}
              entry={entry}
              onInspect={setDetail}
              onAppend={append}
              canEdit={canEdit}
            />
          ))}
        </ul>
      )}
      <p className="library-footnote">
        Drag a preset onto the chart to place it at a specific time, or press + to add it at the end
        ({Math.round(durationMs)} ms).
      </p>
      {detail && (
        <LibraryDetail
          entry={detail}
          phonePreset={{ resourceId: `library:${detail.id}`, name: detail.name }}
          onClose={() => setDetail(null)}
          onAppend={append}
          onPreview={onPreview}
          onStopPreview={onStopPreview}
          previewing={previewing}
          canEdit={canEdit}
        />
      )}
    </div>
  );
}
