import { ProjectSidebar } from "../features/project/ProjectSidebar";
import { ProjectDashboard } from "../features/project/ProjectDashboard";
import { removeProjectMedia } from "../features/project/mediaTransfer";
import { MediaLibraryPanel } from "../features/media/MediaLibraryPanel";
import { Device } from "../features/connection/Device";
import { SharePanel } from "../features/connection/SharePanel";
import { ActivityPanel } from "../features/activity/ActivityPanel";
import { ToolsPanel } from "../features/tools/ToolsPanel";
import { McpPanel } from "../features/mcp/McpPanel";
import { WorkspaceSettings, LearnPanel } from "./WorkspaceSettings";
import type { Studio } from "./useStudio";
interface ISidebarPanel {
  studio: Studio;
}
function SidebarContents(props: ISidebarPanel) {
  const { studio } = props;
  const { document, session } = studio;
  const openInspector = (tab: "sound" | "animation") => {
    studio.setInspector(tab);
    studio.setInspectorOpen(true);
  };
  switch (studio.panel) {
    case "projects":
      return (
        <ProjectDashboard
          projects={document.catalog.items}
          currentId={document.projectId}
          pattern={document.preset}
          onCreate={() => document.catalog.create()}
          onOpen={document.catalog.open}
          onRename={document.catalog.rename}
          onDuplicate={document.catalog.duplicate}
          onDelete={async (id) => {
            try {
              const removed = await document.catalog.remove(id);
              if (removed) await removeProjectMedia(id);
              return removed;
            } catch (error) {
              studio.setError(
                error instanceof Error ? error.message : "Could not delete project media",
              );
              return false;
            }
          }}
          onCopyPattern={document.catalog.copyPattern}
        />
      );
    case "patterns":
      return (
        <ProjectSidebar
          project={document.project}
          preset={document.preset}
          onPreview={studio.audition}
          onAdd={studio.addPreset}
          onSelect={studio.selectPreset}
          onRemove={document.removePreset}
          onImport={studio.importFile}
          onExport={studio.exportProject}
        />
      );
    case "media":
      return (
        <MediaLibraryPanel
          media={studio.media}
          onImport={studio.importFile}
          onOpenSound={() => openInspector("sound")}
          onOpenAnimation={() => openInspector("animation")}
        />
      );
    case "device":
      return (
        <div className="panel-content">
          <Device phones={session.phones} room={session.room} />
          <ActivityPanel entries={studio.activity.entries} />
        </div>
      );
    case "share":
      return <SharePanel sharing={studio.sharing} />;
    case "tools":
      return (
        <ToolsPanel
          pattern={document.pattern}
          onApply={studio.applyPattern}
          onAdd={studio.addPreset}
          onError={studio.setError}
          onOpenAudioTrim={() => openInspector("sound")}
          onPreview={studio.audition}
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
      return <LearnPanel />;
    case null:
      return null;
  }
}
export function SidebarPanel(props: ISidebarPanel) {
  const { studio } = props;
  return (
    <div className="workspace-sidebar" aria-label={`${studio.panel} panel`}>
      <header className="panel-heading">
        <h2>{studio.panel}</h2>
        <button className="icon" aria-label="Hide panel" onClick={() => studio.setPanel(null)}>
          ‹
        </button>
      </header>
      <SidebarContents studio={studio} />
    </div>
  );
}
