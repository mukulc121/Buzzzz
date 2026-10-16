import { useState } from "react";
import { Download } from "../../components/icons";
import { InspectorSection } from "../../components/InspectorSection";
import { ExportSettings } from "./export/ExportSettings";
import { exportLabel, type IExportFiles } from "../../features/export/model";
import type { Studio } from "../useStudio";

interface IInspectorExports {
  studio: Studio;
}
export function InspectorExports(props: IInspectorExports) {
  const { studio } = props;
  const { document } = studio;
  const [expanded, setExpanded] = useState(false);
  const [excluded, setExcluded] = useState<string[]>([]);
  const [files, setFiles] = useState<IExportFiles>({ includeAudio: true, includeAnimation: true });
  const [error, setError] = useState<string | null>(null);
  const selected = document.project.presets.filter((preset) => !excluded.includes(preset.id));
  const allSelected = selected.length === document.project.presets.length;
  return (
    <InspectorSection title="Export">
      <div className="inspector-exports">
        <details
          className="export-settings"
          onToggle={(event) => setExpanded(event.currentTarget.open)}
        >
          <summary>
            <svg
              className="export-chevron"
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path d="m6 3 5 5-5 5" />
            </svg>
            <span>Settings</span>
          </summary>
          {expanded && (
            <ExportSettings
              project={document.project}
              projectId={document.projectId}
              currentId={document.preset.id}
              excluded={excluded}
              allSelected={allSelected}
              files={files}
              media={studio.media.library}
              onFilesChange={setFiles}
              onToggle={(id) =>
                setExcluded((items) =>
                  items.includes(id) ? items.filter((item) => item !== id) : [...items, id],
                )
              }
              onToggleAll={() =>
                setExcluded(allSelected ? document.project.presets.map((preset) => preset.id) : [])
              }
            />
          )}
        </details>
        <button
          type="button"
          disabled={!selected.length}
          onClick={async () => {
            setError(null);
            const failure = await studio.exportProject({
              presetIds: selected.map((preset) => preset.id),
              ...files,
            });
            if (failure) setError(failure);
          }}
        >
          <Download />
          {exportLabel(selected.length, document.project.presets.length)}
        </button>
        {error && (
          <p className="hint" role="alert">
            {error}
          </p>
        )}
      </div>
    </InspectorSection>
  );
}
