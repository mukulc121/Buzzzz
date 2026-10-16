import type { Project } from "@buzzzz/core";
import type { IMediaAttachment, IMediaItem, MediaKind } from "../../../features/media/model";
import { InspectorSwitch } from "../InspectorSwitch";
import { ExportPresetRow } from "./ExportPresetRow";
import type { IExportFiles } from "../../../features/export/model";
import { useExportAttachments } from "../../../features/export/useExportAttachments";

interface IExportSettings {
  project: Project;
  projectId: string;
  currentId: string;
  excluded: readonly string[];
  allSelected: boolean;
  files: IExportFiles;
  media: { items: readonly IMediaItem[]; attachment: Partial<Record<MediaKind, IMediaAttachment>> };
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  onFilesChange: (files: IExportFiles) => void;
}

export function ExportSettings(props: IExportSettings) {
  const {
    project,
    projectId,
    currentId,
    excluded,
    allSelected,
    files,
    media,
    onToggle,
    onToggleAll,
    onFilesChange,
  } = props;
  const attached = useExportAttachments({
    projectId,
    presetIds: project.presets.map((preset) => preset.id),
    ...media,
  });
  return (
    <div className="export-settings-body">
      <div className="export-subhead">
        <span>Patterns</span>
        <button type="button" className="export-select-all" onClick={onToggleAll}>
          {allSelected ? "Clear all" : "Select all"}
        </button>
      </div>
      <ul className="export-presets">
        {project.presets.map((preset) => (
          <ExportPresetRow
            key={preset.id}
            preset={preset}
            open={preset.id === currentId}
            checked={!excluded.includes(preset.id)}
            kinds={attached.kinds[preset.id] ?? []}
            files={files}
            onToggle={() => onToggle(preset.id)}
          />
        ))}
      </ul>
      <div className="export-subhead">
        <span>Files</span>
      </div>
      <InspectorSwitch
        label="Include audio files"
        checked={files.includeAudio}
        onChange={(includeAudio) => onFilesChange({ ...files, includeAudio })}
      />
      <InspectorSwitch
        label="Include animation files"
        checked={files.includeAnimation}
        onChange={(includeAnimation) => onFilesChange({ ...files, includeAnimation })}
      />
      {attached.error && (
        <p className="hint" role="alert">
          {attached.error}
        </p>
      )}
    </div>
  );
}
