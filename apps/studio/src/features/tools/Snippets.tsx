import { useState } from "react";
import { patternEnd, type Pattern } from "@buzzzz/core";
import { snippetRange } from "./patternMath";
import { loadSnippets, saveSnippets, type ISnippet } from "./snippetsStore";

interface ISnippets {
  pattern: Pattern;
  onAdd: (pattern?: Pattern, name?: string) => void;
  onPreview?: (pattern: Pattern) => void;
  onError: (message: string) => void;
}

export function Snippets(props: ISnippets) {
  const [snippets, setSnippets] = useState(loadSnippets);
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
          id: crypto.randomUUID(),
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
    <div className="panel-content">
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
      <ul className="list">
        {snippets.map((snippet) => (
          <li key={snippet.id}>
            <span className="grow">
              {snippet.name}
              <small>{(snippet.durationMs / 1000).toFixed(2)}s</small>
            </span>
            <button
              disabled={!props.onPreview}
              onClick={() => props.onPreview?.(snippet.pattern)}
              aria-label={`Preview snippet ${snippet.name}`}
            >
              Preview
            </button>
            <button
              onClick={() => props.onAdd(structuredClone(snippet.pattern), snippet.name)}
              aria-label={`Add snippet ${snippet.name}`}
            >
              Add
            </button>
            <button
              onClick={() => persist(snippets.filter((item) => item.id !== snippet.id))}
              aria-label={`Delete snippet ${snippet.name}`}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
      {!snippets.length && <p>No saved snippets.</p>}
    </div>
  );
}
