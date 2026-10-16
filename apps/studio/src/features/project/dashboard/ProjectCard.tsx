import { useState } from "react";
import { DashboardIcon } from "./DashboardIcon";
import { PatternThumb } from "./PatternThumb";
import {
  hasPatternDrag,
  readPatternDrag,
  writePatternDrag,
  type IPatternDrag,
} from "./patternDrag";
import { editedAgo, patternCount, PREVIEWS, type IProjectSummary } from "../model";

interface IProjectCard {
  project: IProjectSummary;
  current: boolean;
  onOpen: () => void;
  onMenu: (x: number, y: number) => void;
  onDropPattern: (drag: IPatternDrag) => void;
}

export function ProjectCard(props: IProjectCard) {
  const { project, current, onOpen, onMenu, onDropPattern } = props;
  const [dropping, setDropping] = useState(false);
  const overflow = project.patterns - PREVIEWS;
  return (
    <li
      className="project-card"
      data-drop={dropping || undefined}
      onContextMenu={(event) => {
        event.preventDefault();
        onMenu(event.clientX, event.clientY);
      }}
      onDragOver={(event) => {
        if (!hasPatternDrag(event.dataTransfer)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
        setDropping(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropping(false);
      }}
      onDrop={(event) => {
        if (!hasPatternDrag(event.dataTransfer)) return;
        event.preventDefault();
        event.stopPropagation();
        setDropping(false);
        const drag = readPatternDrag(event.dataTransfer);
        if (drag) onDropPattern(drag);
      }}
    >
      <div className="project-card-preview">
        {project.patterns === 0 ? (
          <p className="project-card-empty">
            <DashboardIcon name="waveform" size={16} />
            Nothing designed yet
          </p>
        ) : (
          <>
            {project.previews.map((preset) => (
              <span
                key={preset.id}
                className="project-card-tile"
                draggable
                title={`${preset.name} - drag onto another project to copy it there`}
                onClick={onOpen}
                onDragStart={(event) =>
                  writePatternDrag(event.dataTransfer, {
                    sourceProjectId: project.id,
                    presetId: preset.id,
                  })
                }
              >
                <PatternThumb pattern={preset.pattern} />
              </span>
            ))}
            {overflow > 0 && <span className="project-card-overflow">+{overflow}</span>}
          </>
        )}
      </div>
      <div className="project-card-body">
        <div className="project-card-text">
          <h3>
            <button
              type="button"
              className="project-card-open"
              aria-current={current}
              onClick={onOpen}
            >
              {project.name}
            </button>
          </h3>
          <p>
            {patternCount(project.patterns)}
            <span aria-hidden>·</span>
            Edited {editedAgo(project.updatedAt)}
          </p>
        </div>
        <button
          type="button"
          className="project-card-menu"
          aria-label={`Actions for ${project.name}`}
          title={`Actions for ${project.name}`}
          onClick={(event) => {
            const box = event.currentTarget.getBoundingClientRect();
            onMenu(box.right, box.bottom + 4);
          }}
        >
          <DashboardIcon name="ellipsis" />
        </button>
      </div>
    </li>
  );
}
