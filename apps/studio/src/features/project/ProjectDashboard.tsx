import { useState } from "react";
import { Copy, Plus, X } from "../../components/icons";
import { filterProjects, type IProjectSummary, type TProjectSort } from "./model";

interface IProjectDashboard {
  projects: IProjectSummary[];
  currentId: string;
  pattern?: { id: string; name: string };
  onOpen: (id: string) => void;
  onCreate: () => void;
  onRename: (id: string, name: string) => Promise<boolean>;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => Promise<boolean>;
  onCopyPattern?: (presetId: string, targetId: string) => Promise<boolean>;
}

const BUSY = "That project is open in another window. Close it there first.";
const edited = (time: number) =>
  new Date(time).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

export function ProjectDashboard(props: IProjectDashboard) {
  const { projects, currentId, pattern, onOpen, onCreate, onRename, onDuplicate, onDelete } = props;
  const { onCopyPattern } = props;
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<TProjectSort>("updated");
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const visible = filterProjects(projects, query, sort);

  const report = (done: boolean, success: string) => setNotice(done ? success : BUSY);
  const commitRename = async () => {
    if (!editing) return;
    report(await onRename(editing.id, editing.name), "Renamed");
    setEditing(null);
  };

  return (
    <section className="panel-content" aria-label="Projects">
      <div className="row project-tools">
        <input
          className="search grow"
          type="search"
          aria-label="Search projects"
          placeholder="Search projects"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <select
          aria-label="Sort projects"
          value={sort}
          onChange={(event) => setSort(event.target.value as TProjectSort)}
        >
          <option value="updated">Last edited</option>
          <option value="name">Name</option>
          <option value="created">Created</option>
        </select>
        <button onClick={onCreate}>
          <Plus /> New
        </button>
      </div>
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      {visible.length === 0 && <p className="empty">No projects match “{query}”.</p>}
      <ul className="list project-list">
        {visible.map((item) => {
          const current = item.id === currentId;
          return (
            <li key={item.id} className={current ? "active" : ""}>
              {editing?.id === item.id ? (
                <input
                  className="grow"
                  aria-label={`Rename ${item.name}`}
                  autoFocus
                  value={editing.name}
                  onChange={(event) => setEditing({ id: item.id, name: event.target.value })}
                  onBlur={() => void commitRename()}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") event.currentTarget.blur();
                    if (event.key === "Escape") setEditing(null);
                  }}
                />
              ) : (
                <button
                  className="preset-select"
                  aria-current={current}
                  onClick={() => onOpen(item.id)}
                  onDoubleClick={() => setEditing({ id: item.id, name: item.name })}
                >
                  <span className="grow">
                    {item.name}
                    <small>
                      {item.patterns} {item.patterns === 1 ? "pattern" : "patterns"} ·{" "}
                      {edited(item.updatedAt)}
                    </small>
                  </span>
                </button>
              )}
              <button onClick={() => setEditing({ id: item.id, name: item.name })}>Rename</button>
              <button
                className="icon"
                title="Duplicate"
                aria-label={`Duplicate ${item.name}`}
                onClick={() => onDuplicate(item.id)}
              >
                <Copy />
              </button>
              {pattern && onCopyPattern && !current && (
                <button
                  title={`Copy ${pattern.name} into this project`}
                  onClick={async () =>
                    report(await onCopyPattern(pattern.id, item.id), `Copied ${pattern.name}`)
                  }
                >
                  Copy pattern here
                </button>
              )}
              {confirming === item.id ? (
                <button
                  className="primary"
                  onClick={async () => {
                    setConfirming(null);
                    report(await onDelete(item.id), `Deleted ${item.name}`);
                  }}
                >
                  Delete for good
                </button>
              ) : (
                <button
                  className="icon"
                  title="Delete"
                  aria-label={`Delete ${item.name}`}
                  onClick={() => setConfirming(item.id)}
                >
                  <X />
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
