import { useState } from "react";
import { Header } from "./Header";
import { ToolRail } from "./ToolRail";
import { SidebarPanel } from "./SidebarPanel";
import { EditorCanvas } from "./EditorCanvas";
import { InspectorPanel } from "./InspectorPanel";
import { useStudio } from "./useStudio";
import { X } from "../components/icons";

export default function App() {
  const studio = useStudio();
  const [dragging, setDragging] = useState(false);
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
      <Header
        phones={studio.session.phones}
        connected={studio.session.connected}
        theme={studio.appearance.theme}
        setTheme={studio.appearance.setTheme}
      />
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
        data-sidebar={studio.panel !== null}
        data-inspector={studio.inspectorOpen}
      >
        <ToolRail active={studio.panel} onSelect={studio.setPanel} phones={studio.session.phones} />
        {studio.panel && <SidebarPanel studio={studio} />}
        <EditorCanvas studio={studio} />
        {studio.inspectorOpen && <InspectorPanel studio={studio} />}
      </div>
      <div className={dragging ? "drop-overlay on" : "drop-overlay"} aria-hidden>
        <div>Drop a Rive file, audio track, pattern or project</div>
      </div>
    </div>
  );
}
