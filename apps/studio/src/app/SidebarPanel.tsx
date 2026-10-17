import { ProjectSidebar } from "../features/project/ProjectSidebar";
import { MediaLibraryPanel } from "../features/media/MediaLibraryPanel";
import { Device } from "../features/connection/Device";
import { SharePanel } from "../features/connection/SharePanel";
import { ToolsPanel } from "../features/tools/ToolsPanel";
import { toolBindings } from "./toolBindings";
import { McpPanel } from "../features/mcp/McpPanel";
import { WorkspaceSettings } from "./WorkspaceSettings";
import type { Studio } from "./useStudio";
interface ISidebarPanel {
  studio: Studio;
}
function SidebarContents(props: ISidebarPanel) {
  const { studio } = props;
  const { document, session } = studio;
  switch (studio.panel) {
    case "projects":
      return null;
    case "patterns":
      return (
        <ProjectSidebar
          project={document.project}
          preset={document.preset}
          writable={document.isWriter}
          riveAvailable={session.projectRiv !== null}
          onAdd={studio.addPreset}
          onDuplicate={studio.duplicatePreset}
          onSelect={studio.selectPreset}
          onRemove={document.removePreset}
          onRename={document.renamePreset}
          onHide={() => studio.setPanel(null)}
        />
      );
    case "media":
      return (
        <MediaLibraryPanel
          media={studio.media}
          onImport={studio.importFile}
          canEdit={document.isWriter}
          onAttach={studio.attachMediaAsset}
          preview={studio.mediaPreview}
          onHide={() => studio.setPanel(null)}
        />
      );
    case "device":
      return (
        <Device phones={session.phones} room={session.room} onHide={() => studio.setPanel(null)} />
      );
    case "share":
      return <SharePanel sharing={studio.sharing} />;
    case "tools":
      return (
        <ToolsPanel
          tools={studio.tools}
          session={toolBindings(studio)}
          onHide={() => studio.setPanel(null)}
        />
      );
    case "mcp":
      return (
        <McpPanel
          room={session.room}
          connected={session.connected}
          bridge={studio.mcp}
          canonical={studio.canonical}
          onError={studio.setError}
        />
      );
    case "settings":
      return <WorkspaceSettings studio={studio} />;
    case "learn":
      return null;
    case null:
      return null;
  }
}
export function SidebarPanel(props: ISidebarPanel) {
  const { studio } = props;
  return (
    <div className="workspace-sidebar" aria-label={`${studio.panel} panel`}>
      {studio.panel !== "media" &&
        studio.panel !== "tools" &&
        studio.panel !== "patterns" &&
        studio.panel !== "device" && (
          <header className="panel-heading">
            <h2>{studio.panel}</h2>
            <button className="icon" aria-label="Hide panel" onClick={() => studio.setPanel(null)}>
              ‹
            </button>
          </header>
        )}
      <SidebarContents studio={studio} />
    </div>
  );
}
