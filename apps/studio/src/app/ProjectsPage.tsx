import { ProjectDashboard } from "../features/project/ProjectDashboard";
import { removeProjectMedia } from "../features/project/mediaTransfer";
import { storageReadable } from "../features/project/repository";
import type { Studio } from "./useStudio";

const BUSY = "That project is open in another window. Close it there first.";

interface IProjectsPage {
  studio: Studio;
}

export function ProjectsPage(props: IProjectsPage) {
  const { studio } = props;
  const { catalog, projectId, route } = studio.document;
  const edit = () => studio.setPanel("patterns");
  return (
    <main className="projects-page">
      {route.notice && (
        <p className="notice" role="alert">
          {route.notice}
        </p>
      )}
      <ProjectDashboard
        projects={catalog.items}
        currentId={projectId}
        loadError={!storageReadable()}
        onRetry={catalog.refresh}
        onOpen={(id) => {
          if (id === projectId) {
            route.openProject(id);
            edit();
          } else if (catalog.open(id)) edit();
        }}
        onCreate={async (name) => {
          if (!catalog.create(name)) return "Could not create this project.";
          edit();
          return null;
        }}
        onCreateSample={async () => {
          const failure = await studio.createSampleProject();
          if (!failure) edit();
          return failure;
        }}
        onRename={async (id, name) => ((await catalog.rename(id, name)) ? null : BUSY)}
        onRemove={async (id) => {
          try {
            if (await catalog.remove(id)) await removeProjectMedia(id);
            else studio.setError(BUSY);
          } catch (error) {
            studio.setError(
              error instanceof Error ? error.message : "Could not delete project media",
            );
          }
        }}
        onImport={async (file) => {
          const failure = await studio.importFileResult(file);
          if (failure) studio.setError(null);
          else edit();
          return failure;
        }}
        onCopyPattern={async (sourceId, presetId, targetId) => {
          if (!(await catalog.copyPattern(sourceId, presetId, targetId)))
            studio.setError(`Could not copy that pattern. ${BUSY}`);
        }}
      />
    </main>
  );
}
