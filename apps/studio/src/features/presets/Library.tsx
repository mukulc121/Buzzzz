import { useState } from "react";
import { Spark } from "../composer/Spark";
import { Plus } from "../../components/icons";
import type { Pattern } from "@buzzzz/core";
import { pulsarPresets as all } from "@buzzzz/core/presets";

interface ILibrary {
  onPreview: (pattern: Pattern) => void;
  onAdd: (pattern: Pattern, name: string) => void;
}
export function Library(props: ILibrary) {
  const { onPreview, onAdd } = props;
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  const list = needle
    ? all.filter((p) => [p.name, ...p.tags].some((s) => s.toLowerCase().includes(needle)))
    : all;

  return (
    <>
      <input
        className="search"
        type="search"
        aria-label="Search Pulsar presets"
        placeholder={`Search ${all.length} presets or tags`}
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <ul className="list">
        {list.map((p) => (
          <li key={p.tags.join("-") + p.name} title={p.description}>
            <button
              className="preset-select library-preview"
              onClick={() => onPreview(p.pattern)}
              aria-label={`Preview ${p.name}`}
            >
              <Spark pattern={p.pattern} />
              <span className="grow">
                {p.name}
                <small>{p.tags.slice(0, 3).join(" · ")}</small>
              </span>
            </button>
            <button
              className="icon"
              title="Add to project"
              aria-label={`Add ${p.name} to project`}
              onClick={(e) => {
                e.stopPropagation();
                onAdd(structuredClone(p.pattern), p.name);
              }}
            >
              <Plus />
            </button>
          </li>
        ))}
        {!list.length && <li className="empty">No presets match “{q}”.</li>}
      </ul>
    </>
  );
}
