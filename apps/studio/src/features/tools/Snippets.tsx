import { randomUUID } from "../../crypto";
import { useState } from "react";
import { patternEnd, type Pattern } from "@buzzzz/core";
import { snippetRange } from "./patternMath";
import { loadSnippets, saveSnippets, type ISnippet } from "./snippetsStore";
import { SnippetRow } from "./SnippetRow";
import { LibraryDetail } from "../presets/LibraryDetail";
import type { StudioPreset } from "../presets/catalog";

interface ISnippets {
  pattern: Pattern;
  onAppend: (pattern: Pattern, timeMs?: number) => void;
  onPreview: (pattern: Pattern) => void;
  onStopPreview: () => void;
  previewing: boolean;
  durationMs: number;
  canEdit: boolean;
  onError: (message: string) => void;
}

export function Snippets(props: ISnippets) {
  const [snippets, setSnippets] = useState(loadSnippets);
  const [detail, setDetail] = useState<StudioPreset | null>(null);
  const [name, setName] = useState("New snippet");
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(Math.max(1, patternEnd(props.pattern)));
  const persist = (next: ISnippet[]) => {
    try {
      saveSnippets(next);
      setSnippets(next);
    } catch (error) {
      props.onError(error instanceof Error ? error.message : "Could not save local snippets");
    }
  };
  const save = () => {
    try {
      const label = name.trim();
      if (!label) throw new Error("Name the snippet first");
      persist([
        ...snippets,
        {
          id: randomUUID(),
          name: label.slice(0, 80),
          durationMs: end - start,
          pattern: snippetRange(props.pattern, start, end),
        },
      ]);
    } catch (error) {
      props.onError(error instanceof Error ? error.message : "Could not create snippet");
    }
  };
  return (
    <div className="panel-content preset-library">
      <p>Save a range on this browser. Leading and trailing silence stay in the snippet.</p>
      <label>
        Snippet name
        <input
          aria-label="Snippet name"
          maxLength={80}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      <div className="row">
        <label>
          Start ms
          <input
            aria-label="Snippet start"
            type="number"
            min="0"
            max="60000"
            step="1"
            value={start}
            onChange={(event) => setStart(Number(event.target.value))}
          />
        </label>
        <label>
          End ms
          <input
            aria-label="Snippet end"
            type="number"
            min="1"
            max="60000"
            step="1"
            value={end}
            onChange={(event) => setEnd(Number(event.target.value))}
          />
        </label>
      </div>
      <div className="row">
        <button onClick={save} disabled={snippets.length >= 20}>
          Save range as snippet
        </button>
        <button
          onClick={() => {
            setStart(0);
            setEnd(Math.max(1, patternEnd(props.pattern)));
          }}
        >
          Use full pattern
        </button>
      </div>
      <ul className="library-list">
        {snippets.map((snippet) => (
          <SnippetRow
            key={snippet.id}
            snippet={snippet}
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
      {!snippets.length && <p>No saved snippets.</p>}
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
