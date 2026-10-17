import { useState } from "react";
import type { Project } from "@buzzzz/core";
import { PatternListItem } from "./PatternListItem";
import { PatternActionIcon } from "./PatternActionIcon";

interface IProjectSidebar {
  project: Project;
  preset: Project["presets"][number];
  writable: boolean;
  onAdd: () => void;
  onDuplicate: (id: string) => void;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onHide: () => void;
}
export function ProjectSidebar(props: IProjectSidebar) {
  const { project, preset, writable, onAdd, onDuplicate, onSelect, onRemove, onRename, onHide } =
    props;
  const [renamingId, setRenamingId] = useState<string | null>(null);
  return (
    <aside className="patterns-panel" aria-label="Project patterns">
      <header className="panel-heading patterns-heading">
        <h2>Patterns</h2>
        <div className="patterns-heading-actions">
          <button
            type="button"
            className="icon"
            aria-label="New pattern"
            title="New pattern"
            onClick={() => onAdd()}
            disabled={!writable}
          >
            <PatternActionIcon name="plus" size={18} />
          </button>
          <button
            type="button"
            className="icon"
            aria-label="Hide panel"
            title="Hide panel"
            onClick={onHide}
          >
            <PatternActionIcon name="collapse" size={18} />
          </button>
        </div>
      </header>
      <ul className="pattern-list">
        {project.presets.map((item) => (
          <PatternListItem
            key={item.id}
            preset={item}
            active={item.id === preset.id}
            writable={writable}
            renaming={item.id === renamingId}
            canRemove={project.presets.length > 1}
            triggers={Object.entries(project.map)
              .filter(([, id]) => id === item.id)
              .map(([trigger]) => trigger)}
            onSelect={onSelect}
            onDuplicate={onDuplicate}
            onRemove={onRemove}
            onRename={(id, name) => {
              onRename(id, name);
              setRenamingId(null);
            }}
            onStartRename={(id) => {
              if (writable) setRenamingId(id);
            }}
            onCancelRename={() => setRenamingId(null)}
          />
        ))}
      </ul>
    </aside>
  );
}
