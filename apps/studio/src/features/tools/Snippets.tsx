import { useEffect, useState } from "react";
import type { Pattern } from "@buzzzz/core";
import { loadSnippets, saveSnippets, type ISnippet } from "./snippetsStore";
import { SnippetRow } from "./SnippetRow";
import { LibraryDetail } from "../presets/LibraryDetail";
import type { StudioPreset } from "../presets/catalog";
import type { IToolSession } from "./model";
import { ToolIcon } from "../../components/ToolIcon";

interface ISnippets {
  pattern: Pattern;
  onAppend: (pattern: Pattern, timeMs?: number) => void;
  onPreview: (pattern: Pattern) => void;
  onStopPreview: () => void;
  previewing: boolean;
  durationMs: number;
  canEdit: boolean;
  onError: (message: string) => void;
  snippets?: IToolSession["snippets"];
}

interface ISnippetActionIcon {
  kind: "save" | "range";
}

function SnippetActionIcon(props: ISnippetActionIcon) {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {props.kind === "range" ? (
        <>
          <rect width={18} height={18} x={3} y={3} rx={2} />
          <path d="M12 3v18" />
        </>
      ) : (
        <>
          <path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
          <path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7" />
          <path d="M7 3v4a1 1 0 0 0 1 1h7" />
        </>
      )}
    </svg>
  );
}

export function Snippets(props: ISnippets) {
  const [snippets, setSnippets] = useState(loadSnippets);
  const [detail, setDetail] = useState<StudioPreset | null>(null);
  const [search, setSearch] = useState("");
  useEffect(() => {
    const refresh = () => setSnippets(loadSnippets());
    window.addEventListener("buzzzz:snippets-changed", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("buzzzz:snippets-changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  const persist = (next: ISnippet[]) => {
    try {
      saveSnippets(next);
      setSnippets(next);
    } catch (error) {
      props.onError(error instanceof Error ? error.message : "Could not save local snippets");
    }
  };
  const query = search.trim().toLowerCase();
  const matches = query
    ? snippets.filter((snippet) => snippet.name.toLowerCase().includes(query))
    : snippets;
  return (
    <div className="snippet-tool preset-library">
      <div className="snippet-save-bar">
        <button
          type="button"
          className="button primary"
          disabled={!props.canEdit || !props.snippets}
          onClick={props.snippets?.savePattern}
          title="Save the whole open pattern as a snippet"
        >
          <SnippetActionIcon kind="save" />
          Save pattern
        </button>
        <button
          type="button"
          className="button secondary"
          disabled={!props.canEdit || !props.snippets}
          onClick={props.snippets?.toggle}
          title="Frame part of the pattern between two rails on the chart"
        >
          {props.snippets?.range ? (
            <ToolIcon name="close" size={16} />
          ) : (
            <SnippetActionIcon kind="range" />
          )}
          {props.snippets?.range ? "Cancel range" : "Select range"}
        </button>
      </div>
      {props.snippets?.range && (
        <p className="snippet-range-hint">
          Drag the rails on the chart to frame the part you want, then press Save snippet.
        </p>
      )}
      {snippets.length > 3 && (
        <input
          type="search"
          aria-label="Search snippets"
          placeholder="Search snippets…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      )}
      {matches.length > 0 && (
        <ul className="library-list">
          {matches.map((snippet) => (
            <SnippetRow
              key={snippet.id}
              snippet={snippet}
              renaming={props.snippets?.pendingRenameId === snippet.id}
              onRenamingEnd={props.snippets?.clearPendingRename}
              canEdit={props.canEdit}
              onAppend={props.onAppend}
              onInspect={(entry) =>
                setDetail({ ...entry, duration: entry.durationMs, description: "", tags: [] })
              }
              onRename={(id, name) =>
                persist(snippets.map((item) => (item.id === id ? { ...item, name } : item)))
              }
              onRemove={(id) => persist(snippets.filter((item) => item.id !== id))}
            />
          ))}
        </ul>
      )}
      {!snippets.length && (
        <div className="snippet-empty">
          <span className="snippet-empty-icon">
            <ToolIcon name="bookmark" size={26} />
          </span>
          <h3>No snippets yet</h3>
          <p>
            Save the whole pattern, or frame part of it between two rails, to reuse across all your
            projects.
          </p>
        </div>
      )}
      {snippets.length > 0 && !matches.length && (
        <p className="snippet-no-match">No snippet matches “{search.trim()}”.</p>
      )}
      {snippets.length > 0 && (
        <p className="library-footnote">
          Drag a snippet onto the chart to place it at a specific time, or press + to append it at
          the end ({Math.round(props.durationMs)} ms).
        </p>
      )}
      {detail && (
        <LibraryDetail
          entry={detail}
          onClose={() => setDetail(null)}
          onAppend={(entry) => props.onAppend(entry.pattern)}
          onPreview={props.onPreview}
          onStopPreview={props.onStopPreview}
          previewing={props.previewing}
          canEdit={props.canEdit}
        />
      )}
    </div>
  );
}
