import { useEffect, useEffectEvent, useId, useRef } from "react";
import { ToolIcon } from "../../components/ToolIcon";
import { LibraryPreview } from "./LibraryPreview";
import type { StudioPreset } from "./catalog";
import type { Pattern } from "@buzzzz/core";

interface ILibraryDetail {
  entry: StudioPreset;
  onClose: () => void;
  onAppend: (entry: StudioPreset) => void;
  onPreview: (pattern: Pattern) => void;
  onStopPreview: () => void;
  previewing: boolean;
  canEdit: boolean;
}

export function LibraryDetail(props: ILibraryDetail) {
  const { entry, onClose, onAppend, onPreview, onStopPreview, previewing, canEdit } = props;
  const dialog = useRef<HTMLDialogElement>(null);
  const ownedPreview = useRef(false);
  const titleId = useId();
  const stop = useEffectEvent(onStopPreview);
  useEffect(() => {
    dialog.current?.showModal();
    return () => {
      if (ownedPreview.current) stop();
    };
  }, []);
  const play = () => {
    if (previewing) {
      ownedPreview.current = false;
      onStopPreview();
    } else {
      ownedPreview.current = true;
      onPreview(entry.pattern);
    }
  };
  return (
    <dialog
      ref={dialog}
      className="library-detail-dialog"
      aria-labelledby={titleId}
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <header>
        <h2 id={titleId}>{entry.name}</h2>
        <button className="library-dialog-close" aria-label="Close" onClick={onClose}>
          <ToolIcon name="close" size={20} />
        </button>
      </header>
      <div className="library-detail-body">
        <LibraryPreview pattern={entry.pattern} />
        <div className="library-detail-playback">
          <button
            className="library-detail-play"
            title="Play through the speakers - pair a phone in the Device panel to feel it too"
            onClick={play}
          >
            {previewing ? <ToolIcon name="stop" size={16} /> : <ToolIcon name="play" size={16} />}
            {previewing ? "Stop" : "Play"}
          </button>
        </div>
        {entry.description && <p className="library-detail-description">{entry.description}</p>}
        {entry.tags.length > 0 && (
          <div className="library-detail-tags">
            {entry.tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        )}
      </div>
      <footer>
        <button
          className="primary"
          disabled={!canEdit}
          onClick={() => {
            onAppend(entry);
            onClose();
          }}
        >
          <ToolIcon name="plus" />
          Add to preset
        </button>
      </footer>
    </dialog>
  );
}
