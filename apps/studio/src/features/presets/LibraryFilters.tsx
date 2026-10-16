import { useState } from "react";
import { X } from "../../components/icons";
import { studioTagCounts, studioTagGroups } from "./catalog";

interface ILibraryFilters {
  active: readonly string[];
  onToggle: (tag: string) => void;
  onClear: () => void;
}

export function LibraryFilters(props: ILibraryFilters) {
  const { active, onToggle, onClear } = props;
  const [expanded, setExpanded] = useState(false);
  return (
    <section className="library-filter">
      <div className="library-filter-header">
        <button
          className="library-filter-toggle"
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d={expanded ? "m6 9 6 6 6-6" : "m9 6 6 6-6 6"} />
          </svg>
          <span>Filter by tag</span>
          {active.length > 0 && <span className="library-filter-badge">{active.length}</span>}
        </button>
        {active.length > 0 && (
          <button className="library-filter-clear" onClick={onClear}>
            Clear
          </button>
        )}
      </div>
      {!expanded && active.length > 0 && (
        <div className="library-filter-chips">
          {active.map((tag) => (
            <button
              className="library-filter-chip"
              aria-pressed="true"
              key={tag}
              title={`Remove ${tag} filter`}
              onClick={() => onToggle(tag)}
            >
              {tag}
              <X />
            </button>
          ))}
        </div>
      )}
      {expanded &&
        studioTagGroups.map((group) => (
          <div className="library-filter-group" key={group.group}>
            <h4>{group.group}</h4>
            <div className="library-filter-chips">
              {group.tags.map((tag) => (
                <button
                  className="library-filter-chip"
                  key={tag.name}
                  title={tag.description}
                  aria-pressed={active.includes(tag.name)}
                  onClick={() => onToggle(tag.name)}
                >
                  {tag.name}
                  <span>{studioTagCounts[tag.name] ?? 0}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
    </section>
  );
}
