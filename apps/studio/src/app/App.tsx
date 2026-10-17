import { useState } from "react";
import { ToolRail } from "./ToolRail";
import { SidebarPanel } from "./SidebarPanel";
import { EditorCanvas } from "./EditorCanvas";
import { InspectorPanel } from "./InspectorPanel";
import { useStudio } from "./useStudio";
import { StudioToolWindow } from "./StudioToolWindow";
import { ProjectsPage } from "./ProjectsPage";
import { X } from "../components/icons";
import { MobileNotice } from "./MobileNotice";
import { Learning } from "../features/learn/Learning";
import { ResizeHandle } from "../components/ResizeHandle";
import { useWorkspaceSize } from "./useWorkspaceSize";

export default function App() {
  const studio = useStudio();
  const workspace = useWorkspaceSize();
  const [dragging, setDragging] = useState(false);
  const [learningOpen, setLearningOpen] = useState(false);
  const dashboard = studio.document.route.dashboard;
  return (
    <div
      className="shell"
      onDragEnter={(event) => {
        if (event.dataTransfer.types.includes("Files")) setDragging(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        if (!event.relatedTarget) setDragging(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        void (async () => {
          for (const file of event.dataTransfer.files) await studio.importFile(file);
        })();
      }}
    >
      {studio.error && (
        <div className="notice" role="alert">
          <span>{studio.error}</span>
          <button onClick={() => studio.setError(null)} aria-label="Dismiss error">
            <X />
          </button>
        </div>
      )}
      <div
        className="workspace"
        style={workspace.style}
        data-page={dashboard ? "projects" : undefined}
        data-sidebar={studio.panel !== null}
        data-inspector={studio.inspectorOpen}
      >
        <ToolRail
          active={dashboard ? "projects" : studio.panel}
          onSelect={(panel) => {
            if (panel === "learn") setLearningOpen(true);
            else if (panel === "projects") studio.document.route.showDashboard();
            else {
              studio.document.route.showEditor();
              studio.setPanel(panel);
            }
          }}
          phones={studio.session.phones}
        />
        {dashboard ? (
          <ProjectsPage studio={studio} />
        ) : (
          <>
            {studio.panel && (
              <>
                <SidebarPanel studio={studio} />
                <ResizeHandle
                  label="Resize side panel"
                  position={76 + workspace.sidebar}
                  {...workspace.sideHandle}
                />
              </>
            )}
            <EditorCanvas studio={studio} />
            {studio.inspectorOpen ? (
              <>
                <ResizeHandle
                  label="Resize inspector"
                  position={`calc(100% - ${workspace.inspector}px)`}
                  {...workspace.inspectorHandle}
                />
                <InspectorPanel studio={studio} />
              </>
            ) : (
              <div className="inspector-rail">
                <button
                  type="button"
                  className="icon inspector-rail-toggle"
                  aria-label="Show inspector"
                  title="Show inspector"
                  onClick={() => studio.setInspectorOpen(true)}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <rect width="18" height="18" x="3" y="3" rx="2" />
                    <path d="M15 3v18" />
                    <path d="m10 15-3-3 3-3" />
                  </svg>
                </button>
              </div>
            )}
          </>
        )}
      </div>
      <div className={dragging ? "drop-overlay on" : "drop-overlay"} aria-hidden>
        <div>Drop a Rive file, audio track, pattern or project</div>
      </div>
      <StudioToolWindow studio={studio} />
      <MobileNotice />
      <Learning studio={studio} open={learningOpen} onClose={() => setLearningOpen(false)} />
    </div>
  );
}
