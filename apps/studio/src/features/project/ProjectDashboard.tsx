import { useRef, useState } from "react";
import { DashboardIcon } from "./dashboard/DashboardIcon";
import { DashboardEmpty } from "./dashboard/DashboardEmpty";
import { ProjectGrid } from "./dashboard/ProjectGrid";
import { ProjectNameDialog } from "./dashboard/ProjectNameDialog";
import { RemoveProjectDialog } from "./dashboard/RemoveProjectDialog";
import { SortSelect } from "./dashboard/SortSelect";
import { filterProjects, type IProjectSummary, type TProjectSort } from "./model";

interface IProjectDashboard {
  projects: IProjectSummary[];
  currentId: string;
  loadError: boolean;
  onRetry: () => void;
  onOpen: (id: string) => void;
  onCreate: (name: string) => Promise<string | null>;
  onCreateSample: () => Promise<string | null>;
  onRename: (id: string, name: string) => Promise<string | null>;
  onRemove: (id: string) => void;
  onImport: (file: File) => Promise<string | null>;
  onCopyPattern: (sourceId: string, presetId: string, targetId: string) => void;
}

export function ProjectDashboard(props: IProjectDashboard) {
  const {
    projects,
    currentId,
    loadError,
    onRetry,
    onOpen,
    onCreate,
    onCreateSample,
    onRename,
    onRemove,
  } = props;
  const { onImport, onCopyPattern } = props;
  const picker = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<TProjectSort>("updated");
  const [naming, setNaming] = useState<IProjectSummary | "new" | null>(null);
  const [removing, setRemoving] = useState<IProjectSummary | null>(null);
  const [importing, setImporting] = useState(false);
  const [creatingSample, setCreatingSample] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const visible = filterProjects(projects, query, sort);
  const startImport = () => picker.current?.click();
  const startCreate = () => setNaming("new");
  const createSample = async () => {
    setImportError(null);
    setCreatingSample(true);
    const failure = await onCreateSample();
    setCreatingSample(false);
    if (failure) setImportError(failure);
  };
  const importFile = async (file: File) => {
    setImportError(null);
    if (!file.name.toLowerCase().endsWith(".pulsar")) {
      setImportError("Choose a .pulsar file to import.");
      return;
    }
    setImporting(true);
    const failure = await onImport(file);
    setImporting(false);
    if (failure) setImportError(`${file.name}: ${failure}`);
  };
  const actions = (
    <>
      <button
        type="button"
        className="dashboard-button secondary"
        disabled={importing}
        onClick={startImport}
      >
        <DashboardIcon name="file-up" />
        <span>Import from file</span>
      </button>
      <button type="button" className="dashboard-button primary" onClick={startCreate}>
        <DashboardIcon name="plus" />
        <span>Create new project</span>
      </button>
      <button
        type="button"
        className="dashboard-button secondary"
        disabled={creatingSample || importing}
        aria-busy={creatingSample}
        onClick={() => void createSample()}
      >
        <DashboardIcon name="plus" />
        <span>Create sample project</span>
      </button>
    </>
  );
  return (
    <section className="project-dashboard" aria-label="Projects">
      <header className="project-dashboard-header">
        <div>
          <h1>Projects</h1>
          <p>Design, preview, and manage your haptic patterns.</p>
        </div>
        <div className="project-dashboard-actions">{actions}</div>
      </header>
      <input
        ref={picker}
        type="file"
        accept=".pulsar"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void importFile(file);
        }}
      />
      {importError && (
        <div className="project-import-error" role="alert">
          <DashboardIcon name="alert" size={15} />
          <span>{importError}</span>
        </div>
      )}
      {projects.length > 0 && (
        <div className="project-dashboard-toolbar">
          <div className="dashboard-search">
            <DashboardIcon name="search" className="dashboard-search-icon" />
            <input
              type="search"
              className="dashboard-input"
              placeholder="Search by name"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            {query && (
              <button type="button" aria-label="Clear search" onClick={() => setQuery("")}>
                <DashboardIcon name="x" size={16} />
              </button>
            )}
          </div>
          <SortSelect value={sort} onChange={setSort} />
        </div>
      )}
      {loadError ? (
        <DashboardEmpty
          icon="alert"
          title="Couldn’t load your projects"
          hint="Check your connection and try again."
        >
          <button type="button" className="dashboard-button secondary" onClick={onRetry}>
            <span>Retry</span>
          </button>
        </DashboardEmpty>
      ) : visible.length > 0 ? (
        <ProjectGrid
          projects={visible}
          currentId={currentId}
          onOpen={(project) => onOpen(project.id)}
          onRename={setNaming}
          onRemove={setRemoving}
          onCopyPattern={(drag, targetId) =>
            onCopyPattern(drag.sourceProjectId, drag.presetId, targetId)
          }
        />
      ) : projects.length > 0 ? (
        <DashboardEmpty
          icon="folder"
          title={`No projects match “${query}”`}
          hint="Try a different name, or clear the search."
        >
          <button type="button" className="dashboard-button secondary" onClick={() => setQuery("")}>
            <span>Clear search</span>
          </button>
        </DashboardEmpty>
      ) : (
        <DashboardEmpty
          icon="folder"
          title="No projects yet"
          hint="A project holds the haptic patterns you design together - start one, or import a .pulsar file you already have."
        >
          {actions}
        </DashboardEmpty>
      )}
      {removing && (
        <RemoveProjectDialog
          name={removing.name}
          onCancel={() => setRemoving(null)}
          onConfirm={() => {
            onRemove(removing.id);
            setRemoving(null);
          }}
        />
      )}
      {naming && (
        <ProjectNameDialog
          name={naming === "new" ? null : naming.name}
          onSave={(name) => (naming === "new" ? onCreate(name) : onRename(naming.id, name))}
          onClose={() => setNaming(null)}
        />
      )}
    </section>
  );
}
