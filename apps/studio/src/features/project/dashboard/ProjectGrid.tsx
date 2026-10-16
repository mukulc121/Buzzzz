import { useCallback, useState } from "react";
import { DashboardContextMenu } from "./DashboardContextMenu";
import { ProjectCard } from "./ProjectCard";
import type { IPatternDrag } from "./patternDrag";
import type { IProjectSummary } from "../model";

interface IProjectGrid {
  projects: IProjectSummary[];
  currentId: string;
  onOpen: (project: IProjectSummary) => void;
  onRename: (project: IProjectSummary) => void;
  onRemove: (project: IProjectSummary) => void;
  onCopyPattern: (drag: IPatternDrag, targetId: string) => void;
}

export function ProjectGrid(props: IProjectGrid) {
  const { projects, currentId, onOpen, onRename, onRemove, onCopyPattern } = props;
  const [menu, setMenu] = useState<{ x: number; y: number; project: IProjectSummary } | null>(null);
  const close = useCallback(() => setMenu(null), []);
  return (
    <>
      <ul className="project-grid">
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            current={project.id === currentId}
            onOpen={() => onOpen(project)}
            onMenu={(x, y) => setMenu({ x, y, project })}
            onDropPattern={(drag) => {
              if (drag.sourceProjectId !== project.id) onCopyPattern(drag, project.id);
            }}
          />
        ))}
      </ul>
      {menu && (
        <DashboardContextMenu
          x={menu.x}
          y={menu.y}
          onClose={close}
          items={[
            { label: "Open", icon: "folder-open", onSelect: () => onOpen(menu.project) },
            { label: "Rename", icon: "pencil", onSelect: () => onRename(menu.project) },
            { separator: true },
            {
              label: "Remove",
              icon: "trash",
              danger: true,
              onSelect: () => onRemove(menu.project),
            },
          ]}
        />
      )}
    </>
  );
}
