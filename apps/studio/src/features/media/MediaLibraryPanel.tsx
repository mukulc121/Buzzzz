import { useState } from "react";
import { Plus, Upload } from "../../components/icons";
import { InspectorIcon } from "../../components/InspectorIcon";
import { mediaUsage } from "./attachments";
import { formatMediaSize } from "./formatMediaSize";
import { MediaRow } from "./MediaRow";
import { MediaUploader } from "./MediaUploader";
import { MEDIA_LIMITS } from "./model";
import type { AttachedTracks } from "./useAttachedTracks";
import type { useMediaPreview } from "./useMediaPreview";

interface IMediaLibraryPanel {
  media: AttachedTracks;
  onImport: (file: File) => Promise<unknown>;
  onHide: () => void;
  canEdit: boolean;
  onAttach: (id: string) => Promise<boolean>;
  preview: ReturnType<typeof useMediaPreview>;
}

export function MediaLibraryPanel(props: IMediaLibraryPanel) {
  const { media, onImport, onHide, canEdit, onAttach, preview } = props;
  const { library } = media;
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const usage = mediaUsage(library.items);
  const usedPercent = Math.min(100, (usage.bytes / MEDIA_LIMITS.projectBytes) * 100);
  const importFiles = async (files: File[]) => {
    if (!canEdit) return;
    for (const file of files) await onImport(file);
  };
  return (
    <>
      <header className="panel-heading media-heading">
        <h2>Media</h2>
        <div className="media-heading-actions">
          <button
            className="icon"
            aria-label="Upload media"
            disabled={!canEdit}
            onClick={() => setUploading(true)}
          >
            <Plus />
          </button>
          <button className="icon" aria-label="Hide panel" onClick={onHide}>
            <span className="sidebar-collapse">
              <InspectorIcon name="collapse" />
            </span>
          </button>
        </div>
      </header>
      <section
        className="panel-content media-library"
        aria-label="Media library"
        data-dragging={dragging}
        onDragOver={(event) => {
          if (!event.dataTransfer.types.includes("Files")) return;
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(event) => {
          if (
            !(event.relatedTarget instanceof Node) ||
            !event.currentTarget.contains(event.relatedTarget)
          )
            setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setDragging(false);
          void importFiles(Array.from(event.dataTransfer.files));
        }}
      >
        <div className="media-usage" aria-label="Browser storage">
          <div className="media-usage-head">
            <strong>Browser storage</strong>
            <span>
              {formatMediaSize(usage.bytes)} / {formatMediaSize(MEDIA_LIMITS.projectBytes)}
            </span>
          </div>
          <div
            className="media-usage-track"
            role="progressbar"
            aria-label="Browser storage used"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(usedPercent)}
          >
            <span style={{ width: `${usedPercent}%` }} />
          </div>
        </div>
        {!library.ready ? (
          <p className="hint" role="status">
            Loading media…
          </p>
        ) : library.items.length === 0 ? (
          <div className="media-empty">
            <span className="media-empty-icon">
              <Upload />
            </span>
            <h3>No media yet</h3>
            <p className="hint">
              Drop audio, Lottie animation, or Rive files here, or use the + button to browse.
            </p>
          </div>
        ) : (
          <ul className="list media-items" aria-label="Media files">
            {library.items.map((item) => (
              <MediaRow
                key={item.id}
                item={item}
                media={media}
                canEdit={canEdit}
                onAttach={onAttach}
                preview={preview}
              />
            ))}
          </ul>
        )}
        {dragging && (
          <div className="media-drop-overlay" aria-hidden="true">
            <Upload />
            Drop to upload
          </div>
        )}
      </section>
      {uploading && <MediaUploader onImport={onImport} onClose={() => setUploading(false)} />}
    </>
  );
}
