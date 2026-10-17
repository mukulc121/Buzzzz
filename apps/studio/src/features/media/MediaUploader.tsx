import { useEffect, useRef, useState } from "react";
import { MediaActionIcon } from "./MediaActionIcon";

interface IMediaUploader {
  onImport: (file: File) => Promise<unknown>;
  onClose: () => void;
}

export function MediaUploader(props: IMediaUploader) {
  const { onImport, onClose } = props;
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  const importFiles = async (files: File[]) => {
    for (const file of files) await onImport(file);
  };
  const upload = (files: FileList | null) => {
    if (!files?.length) return;
    void importFiles(Array.from(files));
    onClose();
  };
  return (
    <dialog
      ref={dialog}
      className="media-upload-dialog"
      aria-labelledby="media-upload-title"
      onCancel={onClose}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <header>
        <h2 id="media-upload-title">Upload media</h2>
        <button className="media-upload-close" aria-label="Close upload" onClick={onClose}>
          <MediaActionIcon name="close" size={20} />
        </button>
      </header>
      <div className="media-upload-body">
        <button
          className="media-drop-area"
          data-dragging={dragging}
          onClick={() => input.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setDragging(false);
            upload(event.dataTransfer.files);
          }}
        >
          <MediaActionIcon name="upload" size={28} />
          <span className="media-drop-title">Drag files here</span>
          <span className="media-drop-hint">
            or click to browse - MP3/WAV audio, Lottie (.json/.lottie) animations, or Rive (.riv)
          </span>
        </button>
        <input
          ref={input}
          aria-label="Media files"
          type="file"
          accept="audio/*,.mp3,.wav,.ogg,.m4a,.flac,.json,.lottie,.riv,application/json,application/zip+dotlottie"
          multiple
          hidden
          onChange={(event) => upload(event.currentTarget.files)}
        />
      </div>
      <footer>
        <button className="media-upload-cancel" onClick={onClose}>
          Cancel
        </button>
        <button className="primary" onClick={() => input.current?.click()}>
          <MediaActionIcon name="upload" size={18} />
          <span>Choose files</span>
        </button>
      </footer>
    </dialog>
  );
}
